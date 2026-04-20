import json
import re
from datetime import datetime, timedelta

from django.db import connection
from django.http import JsonResponse
from django.views.decorators.http import require_GET

AT_RISK_WEEKS = 10
OVERDUE_WEEKS = 12
AT_RISK_DAYS = AT_RISK_WEEKS * 7
OVERDUE_DAYS = OVERDUE_WEEKS * 7
SUMMARY_TABLE_NAME = "PR_BOOKING_SUMMERIES"

QA_CRITERIA_TITLES = [
    "Review within required timeframe",
    "Duration (expected 1 hour)",
    "Attendance (learner, employer, skill coach)",
    "Progress vs Apprenticeship Standard, KSBs",
    "Off the job training hours reviewed and recorded",
    "Learner explains learning and application at work",
    "Employer feedback on workplace performance",
    "Safeguarding and wellbeing check",
    "Support needs or risks identified and addressed",
    "SMART actions set for learner, employer, coach",
    "Actions linked to progress gaps or next assessment steps",
    "Notes clear, specific, non generic",
    "Review confirmed, signed off by all parties",
]
MISSING_EMPLOYER_LABEL = "didn’t attend the meeting"


@require_GET
def health_check(request):
    return JsonResponse({"status": "ok"})


def _parse_duration_minutes(duration_text):
    if not duration_text or not isinstance(duration_text, str):
        return 60
    match = re.match(r"^(\d{1,2}):(\d{2})(?::\d{2})?$", duration_text.strip())
    if not match:
        return 60
    hours = int(match.group(1))
    minutes = int(match.group(2))
    return (hours * 60) + minutes


def _safe_identifier(value):
    return f'"{str(value).replace(chr(34), chr(34) * 2)}"'


def _find_summary_table():
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = %s
            LIMIT 1
            """,
            [SUMMARY_TABLE_NAME],
        )
        row = cursor.fetchone()
    return row[0] if row else None


def _find_first_matching_key(record, candidates=(), contains=()):
    if not record:
        return None

    lowered = {str(key).lower(): key for key in record.keys()}
    for candidate in candidates:
        key = lowered.get(candidate.lower())
        if key is not None:
            return key

    for fragment in contains:
        fragment_lower = fragment.lower()
        for lowered_key, original_key in lowered.items():
            if fragment_lower in lowered_key:
                return original_key
    return None


def _coerce_text(value):
    if value is None:
        return ""
    return str(value).strip()


def _to_number(value):
    if value is None:
        return None
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return None


def _parse_date_from_text(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value.date()

    text = str(value).strip()
    if not text:
        return None

    direct = _safe_date(text)
    if direct:
        return direct

    match = re.search(r"(\d{2})-(\d{2})-(\d{4})", text)
    if match:
        day, month, year = match.groups()
        try:
            return datetime.strptime(f"{year}-{month}-{day}", "%Y-%m-%d").date()
        except ValueError:
            return None
    return None


def _status_from_text(value):
    text = _coerce_text(value).lower()
    if not text:
        return ""
    if "complete" in text or "completed" in text or "evidence" in text:
        return "COMPLETED"
    if "in progress" in text or "booking" in text or "booked" in text:
        return "BOOKING"
    if "not started" in text or "not yet" in text:
        return "AT_RISK"
    if "overdue" in text:
        return "OVERDUE"
    return ""


def _review_state_from_kbc_row(last_review_value, planned_values, status_values):
    last_completed_date = None
    last_review_status = _status_from_text(last_review_value)
    last_review_date = _parse_date_from_text(last_review_value)
    if last_review_status == "COMPLETED" and last_review_date:
        last_completed_date = last_review_date

    current_planned_date = None
    current_status = ""
    completed_dates = [last_review_date] if last_completed_date else []

    for planned_value, status_value in zip(planned_values, status_values):
        planned_date = _parse_date_from_text(planned_value)
        parsed_status = _status_from_text(status_value or planned_value)
        if parsed_status == "COMPLETED" and planned_date:
            completed_dates.append(planned_date)
            continue
        if not current_planned_date and planned_date:
            current_planned_date = planned_date
        if not current_status and parsed_status:
            current_status = parsed_status

    if completed_dates:
        last_completed_date = max([d for d in completed_dates if d is not None])

    if not current_status:
        current_status = _status_from_timeline(last_completed_date, current_planned_date)
    elif current_status == "AT_RISK":
        current_status = _status_from_timeline(last_completed_date, None)

    base_review_date = last_completed_date or current_planned_date or datetime.utcnow().date()
    warning_date, overdue_date = _review_window_dates(base_review_date)
    next_due_date = current_planned_date or overdue_date or base_review_date

    return {
        "last_completed_date": last_completed_date or base_review_date,
        "meeting_date": current_planned_date or last_completed_date or base_review_date,
        "warning_date": warning_date or base_review_date,
        "next_due_date": next_due_date,
        "status": current_status,
    }


def _find_kbc_progress_table():
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT c.table_schema, c.table_name,
                   COUNT(*) FILTER (
                     WHERE lower(c.column_name) LIKE 'last progress review%%'
                        OR lower(c.column_name) LIKE 'review planned%%'
                        OR lower(c.column_name) LIKE 'review status%%'
                   ) AS match_count
            FROM information_schema.columns c
            JOIN information_schema.tables t
              ON t.table_schema = c.table_schema
             AND t.table_name = c.table_name
            WHERE t.table_type = 'BASE TABLE'
              AND c.table_schema NOT IN ('pg_catalog', 'information_schema')
            GROUP BY c.table_schema, c.table_name
            HAVING COUNT(*) FILTER (
                     WHERE lower(c.column_name) LIKE 'last progress review%%'
                        OR lower(c.column_name) LIKE 'review planned%%'
                        OR lower(c.column_name) LIKE 'review status%%'
                   ) >= 3
                OR lower(c.table_name) = 'kbc_users_data'
            ORDER BY
              CASE WHEN lower(c.table_name) = 'kbc_users_data' THEN 0 ELSE 1 END,
              match_count DESC,
              c.table_schema,
              c.table_name
            LIMIT 1
            """
        )
        row = cursor.fetchone()
        if not row:
            return None

        table_schema, table_name, _match_count = row
        cursor.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = %s AND table_name = %s
            ORDER BY ordinal_position
            """,
            [table_schema, table_name],
        )
        columns = [col[0] for col in cursor.fetchall()]

    return {"schema": table_schema, "table": table_name, "columns": columns}


def _fetch_otj_snapshot(learner_name="", learner_email="", programme=""):
    table_name = "PR_BOOKING_SUMMERIES"
    query = f'SELECT * FROM public."{table_name}"'
    filters = []
    params = []
    matched_by = []

    if learner_email:
        filters.append('LOWER("Learner_Email") = LOWER(%s)')
        params.append(learner_email)
        matched_by.append("learnerEmail:Learner_Email")
    elif learner_name:
        filters.append("LOWER(COALESCE(summary_json->>'learner', summary_text::json->>'learner', '')) = LOWER(%s)")
        params.append(learner_name)
        matched_by.append("learnerName:summary_json.learner")

    if programme:
        filters.append("LOWER(COALESCE(summary_json->>'programme', summary_text::json->>'programme', '')) = LOWER(%s)")
        params.append(programme)
        matched_by.append("programme:summary_json.programme")

    if filters:
        query += " WHERE " + " AND ".join(filters)

    if start_date_col:
        query += f" ORDER BY {_safe_identifier(start_date_col)} DESC NULLS LAST"
    query += " LIMIT 1"

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        row = cursor.fetchone()
        if not row:
            return {
                "ok": False,
                "status": 404,
                "payload": {
                    "error": "No OTJ snapshot row matched the learner",
                    "table": f"public.{table_name}",
                    "matchedBy": matched_by,
                    "lookup": {
                        "learnerName": learner_name,
                        "learnerEmail": learner_email,
                        "programme": programme,
                    },
                },
            }
        columns = [col[0] for col in cursor.description]
        record = dict(zip(columns, row))

    summary_obj = record.get("summary_json") or {}
    if not summary_obj and record.get("summary_text"):
        try:
            summary_obj = json.loads(record["summary_text"])
        except json.JSONDecodeError:
            summary_obj = {}

    planned_value = _to_number(record.get("Planned"))
    submitted_value = _to_number(record.get("Submitted"))
    expected_value = _to_number(record.get("Expected"))
    remaining_value = None
    if planned_value is not None and submitted_value is not None:
        remaining_value = planned_value - submitted_value

    return {
        "ok": True,
        "status": 200,
        "payload": {
            "table": f"public.{table_name}",
            "learnerName": _coerce_text(summary_obj.get("learner")),
            "learnerEmail": _coerce_text(record.get("Learner_Email")),
            "programme": _coerce_text(summary_obj.get("programme")),
            "otjHoursStatus": _coerce_text(record.get("OTJHoursStatus")),
            "matchedBy": matched_by,
            "plannedOtj": planned_value,
            "submittedOtj": submitted_value,
            "expectedOtj": expected_value,
            "remainingOtj": remaining_value,
        },
    }

def _build_kbc_review_record(
    *,
    row_identifier,
    sequence,
    learner_name,
    learner_email,
    learner_phone,
    employer_name,
    coach_name,
    programme,
    group_name,
    meeting_date,
    next_due_date,
    warning_date,
    status,
    status_text,
    comments,
    otj_completed_hours=0,
    otj_formula_hours=None,
    otj_programme_total_hours=None,
    otj_total_days=None,
    otj_elapsed_days=None,
    otj_planned_hours=None,
):
    return {
        "id": f"{row_identifier}-{sequence}",
        "learner": {
            "id": f"learner-{row_identifier}",
            "name": learner_name,
            "email": learner_email,
            "phone": learner_phone,
        },
        "employer": {"name": employer_name, "email": ""},
        "coach": {"id": f"coach-{row_identifier}", "name": coach_name, "email": ""},
        "programme": programme,
        "group": group_name,
        "lastReviewDate": meeting_date.isoformat(),
        "meetingDate": meeting_date.isoformat(),
        "nextDueDate": next_due_date.isoformat(),
        "warningDate": warning_date.isoformat(),
        "status": status,
        "duration": 60,
        "attendance": "ALL_PRESENT",
        "checklist": [
            {
                "id": 1,
                "category": "Imported from KBC progress review table",
                "evaluation": "YES" if status == "COMPLETED" else "PARTIAL",
                "comments": comments or status_text or "Imported row",
            }
        ],
        "otjHours": round(otj_completed_hours or 0, 2),
        "otjNotes": "",
        "otjCalculatedHours": round(otj_formula_hours, 2) if otj_formula_hours is not None else None,
        "otjProgrammeHours": round(otj_programme_total_hours, 2) if otj_programme_total_hours is not None else None,
        "otjTotalDays": round(otj_total_days, 2) if otj_total_days is not None else None,
        "otjElapsedDays": round(otj_elapsed_days, 2) if otj_elapsed_days is not None else None,
        "otjPlannedHours": round(otj_planned_hours, 2) if otj_planned_hours is not None else None,
        "riskLevel": "HIGH" if status == "OVERDUE" else "MEDIUM" if status == "AT_RISK" else "LOW",
        "riskNotes": "",
        "actions": [],
        "strengths": [],
        "areasForDevelopment": [],
        "overallJudgement": status_text or "Imported from KBC progress review table.",
        "learnerConfirmed": status == "COMPLETED",
        "employerConfirmed": status == "COMPLETED",
        "coachConfirmed": status == "COMPLETED",
        "signedOff": status == "COMPLETED",
        "createdAt": f"{meeting_date.isoformat()}T09:00:00Z",
        "updatedAt": f"{meeting_date.isoformat()}T09:00:00Z",
        "reportText": comments or "",
        "overallRating": "",
    }


def _fetch_progress_reviews_from_kbc_table(limit):
    table_info = _find_kbc_progress_table()
    if not table_info:
        return None

    columns = table_info["columns"]
    row_id_col = next((col for col in columns if col.lower() == "id"), None)
    order_col = row_id_col or next((col for col in columns if "last progress review" in col.lower()), None)
    schema_sql = _safe_identifier(table_info["schema"])
    table_sql = _safe_identifier(table_info["table"])
    order_sql = _safe_identifier(order_col) if order_col else None

    query = f"SELECT * FROM {schema_sql}.{table_sql}"
    if order_sql:
        query += f" ORDER BY {order_sql} DESC NULLS LAST"
    if limit is not None:
        query += " LIMIT %s"
        params = [limit]
    else:
        params = []

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        rows = cursor.fetchall()
        description = [col[0] for col in cursor.description]

    reviews = []
    for index, row in enumerate(rows, start=1):
        record = dict(zip(description, row))
        last_review_key = _find_first_matching_key(record, contains=("last progress review",))
        planned_keys = [key for key in record.keys() if "review planned" in str(key).lower()]
        status_keys = [key for key in record.keys() if "review status" in str(key).lower()]
        planned_keys.sort(key=lambda value: str(value).lower())
        status_keys.sort(key=lambda value: str(value).lower())

        if not last_review_key and not planned_keys and not status_keys:
            continue

        planned_values = [record.get(key) for key in planned_keys]
        status_values = [record.get(key) for key in status_keys]
        state = _review_state_from_kbc_row(
            record.get(last_review_key),
            planned_values,
            status_values,
        )

        learner_name_key = _find_first_matching_key(
            record,
            candidates=("learner_name", "student_name", "full_name", "name", "learner"),
            contains=("learner", "student", "full name", "candidate name"),
        )
        learner_email_key = _find_first_matching_key(
            record,
            candidates=("email", "learner_email", "student_email"),
            contains=("email",),
        )
        learner_phone_key = _find_first_matching_key(
            record,
            candidates=("phone", "mobile", "telephone", "learner_phone"),
            contains=("phone", "mobile", "telephone"),
        )
        coach_name_key = _find_first_matching_key(
            record,
            candidates=("coach", "coach_name", "tutor", "tutor_name", "skill_coach"),
            contains=("coach", "tutor"),
        )
        employer_name_key = _find_first_matching_key(
            record,
            candidates=("employer", "employer_name", "company", "company_name"),
            contains=("employer", "company"),
        )
        programme_key = _find_first_matching_key(
            record,
            candidates=("programme", "program", "course", "pathway"),
            contains=("programme", "program", "course", "pathway", "support plan"),
        )
        group_key = _find_first_matching_key(
            record,
            candidates=("group", "cohort"),
            contains=("group", "cohort"),
        )
        total_days_key = _find_first_matching_key(
            record,
            candidates=("total_days", "total days"),
            contains=("total days",),
        )
        elapsed_days_key = _find_first_matching_key(
            record,
            candidates=("elapsed_days", "elapsed-days", "elapsed days"),
            contains=("elapsed-days", "elapsed days"),
        )
        planned_otj_key = _find_first_matching_key(
            record,
            candidates=("planned", "planned_otj", "otj_planned"),
            contains=("planned otj", "otj planned", "planned"),
        )
        completed_otj_key = _find_first_matching_key(
            record,
            candidates=("completed", "completed_otj", "otj_completed"),
            contains=("completed otj", "otj completed", "completed"),
        )

        row_identifier = record.get(row_id_col) if row_id_col else index
        learner_name = _coerce_text(record.get(learner_name_key)) or f"Learner {row_identifier}"
        learner_email = _coerce_text(record.get(learner_email_key)) or f"learner{row_identifier}@example.com"
        learner_phone = _coerce_text(record.get(learner_phone_key))
        coach_name = _coerce_text(record.get(coach_name_key)) or "Unknown Coach"
        employer_name = _coerce_text(record.get(employer_name_key)) or MISSING_EMPLOYER_LABEL
        programme = _coerce_text(record.get(programme_key)) or "Unknown Programme"
        group_name = _coerce_text(record.get(group_key)) or "Unknown Group"
        total_days_value = _to_number(record.get(total_days_key))
        elapsed_days_value = _to_number(record.get(elapsed_days_key))
        planned_otj_value = _to_number(record.get(planned_otj_key))
        completed_otj_value = _to_number(record.get(completed_otj_key))
        remaining_days = None
        if total_days_value is not None and elapsed_days_value is not None:
            remaining_days = total_days_value - elapsed_days_value
        otj_formula_hours = None
        otj_programme_total_hours = None
        if planned_otj_value is not None and total_days_value is not None:
            otj_programme_total_hours = total_days_value * planned_otj_value
        if planned_otj_value is not None and remaining_days is not None and completed_otj_value is not None:
            # User-requested formula: completed - ((Total Days - Elapsed-Days) * planned)
            otj_formula_hours = completed_otj_value - (remaining_days * planned_otj_value)
        review_date_text = _coerce_text(record.get(last_review_key))
        review_status_text = next(
            (
                _coerce_text(record.get(key))
                for key in status_keys
                if _coerce_text(record.get(key))
            ),
            "",
        )
        completed_rows = []

        last_review_status = _status_from_text(record.get(last_review_key))
        last_review_date = _parse_date_from_text(record.get(last_review_key))
        if last_review_status == "COMPLETED" and last_review_date:
            completed_rows.append(
                _build_kbc_review_record(
                    row_identifier=row_identifier,
                    sequence="last-completed",
                    learner_name=learner_name,
                    learner_email=learner_email,
                    learner_phone=learner_phone,
                    employer_name=employer_name,
                    coach_name=coach_name,
                    programme=programme,
                    group_name=group_name,
                    meeting_date=last_review_date,
                    next_due_date=last_review_date,
                    warning_date=last_review_date,
                    status="COMPLETED",
                    status_text=_coerce_text(record.get(last_review_key)),
                    comments=review_date_text,
                    otj_completed_hours=completed_otj_value or 0,
                    otj_formula_hours=otj_formula_hours,
                    otj_programme_total_hours=otj_programme_total_hours,
                    otj_total_days=total_days_value,
                    otj_elapsed_days=elapsed_days_value,
                    otj_planned_hours=planned_otj_value,
                )
            )

        for pair_index, (planned_value, status_value) in enumerate(zip(planned_values, status_values), start=1):
            parsed_status = _status_from_text(status_value or planned_value)
            planned_date = _parse_date_from_text(planned_value or status_value)
            if parsed_status != "COMPLETED" or not planned_date:
                continue

            completed_rows.append(
                _build_kbc_review_record(
                    row_identifier=row_identifier,
                    sequence=f"completed-{pair_index}",
                    learner_name=learner_name,
                    learner_email=learner_email,
                    learner_phone=learner_phone,
                    employer_name=employer_name,
                    coach_name=coach_name,
                    programme=programme,
                    group_name=group_name,
                    meeting_date=planned_date,
                    next_due_date=planned_date,
                    warning_date=planned_date,
                    status="COMPLETED",
                    status_text=_coerce_text(status_value) or _coerce_text(planned_value),
                    comments=_coerce_text(planned_value),
                    otj_completed_hours=completed_otj_value or 0,
                    otj_formula_hours=otj_formula_hours,
                    otj_programme_total_hours=otj_programme_total_hours,
                    otj_total_days=total_days_value,
                    otj_elapsed_days=elapsed_days_value,
                    otj_planned_hours=planned_otj_value,
                )
            )

        if completed_rows:
            reviews.extend(completed_rows)
            continue

        reviews.append(
            _build_kbc_review_record(
                row_identifier=row_identifier,
                sequence="current",
                learner_name=learner_name,
                learner_email=learner_email,
                learner_phone=learner_phone,
                employer_name=employer_name,
                coach_name=coach_name,
                programme=programme,
                group_name=group_name,
                meeting_date=state["meeting_date"],
                next_due_date=state["next_due_date"],
                warning_date=state["warning_date"],
                status=state["status"],
                status_text=review_status_text,
                comments=review_date_text,
                otj_completed_hours=completed_otj_value or 0,
                otj_formula_hours=otj_formula_hours,
                otj_programme_total_hours=otj_programme_total_hours,
                otj_total_days=total_days_value,
                otj_elapsed_days=elapsed_days_value,
                otj_planned_hours=planned_otj_value,
            )
        )

    return {
        "ok": True,
        "status": 200,
        "payload": {
            "table": f"{table_info['schema']}.{table_info['table']}",
            "reviews": reviews,
        },
    }


def _norm_name(value):
    return re.sub(r"\s+", " ", (value or "").strip()).lower()


def _norm_booking_identity(value):
    text = (value or "").strip()
    if "|" in text:
        text = text.split("|", 1)[0].strip()
    return _norm_name(text)


def _find_aptem_next_review_source():
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT table_schema, table_name
            FROM information_schema.tables
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
              AND (
                lower(table_name) = 'aptem_auto_extrating'
                OR lower(table_name) LIKE '%aptem%auto%extrat%'
                OR lower(table_name) LIKE '%aptem%auto%extract%'
              )
            ORDER BY
              CASE WHEN lower(table_name) = 'aptem_auto_extrating' THEN 0 ELSE 1 END,
              table_schema,
              table_name
            LIMIT 1
            """
        )
        table_row = cursor.fetchone()
        if not table_row:
            return None

        table_schema, table_name = table_row
        cursor.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = %s AND table_name = %s
            ORDER BY ordinal_position
            """,
            [table_schema, table_name],
        )
        columns = [row[0] for row in cursor.fetchall()]

    lowered = {col.lower(): col for col in columns}

    def pick(*exact, contains=()):
        for name in exact:
            if name.lower() in lowered:
                return lowered[name.lower()]
        for fragment in contains:
            for column in columns:
                if fragment.lower() in column.lower():
                    return column
        return None

    full_name_col = pick("FullName", contains=("full name", "fullname", "learner name", "student name", "name"))
    next_review_col = pick(
        "Next Review (Status)",
        "NextReview",
        contains=("next review",),
    )
    current_review_col = pick(
        "Last Progress Review",
        "Current Review",
        contains=("last progress review", "current review", "meeting date", "review date"),
    )

    if not full_name_col or not next_review_col:
        return None

    return {
        "schema": table_schema,
        "table": table_name,
        "full_name_col": full_name_col,
        "next_review_col": next_review_col,
        "current_review_col": current_review_col,
    }


def _fetch_aptem_next_review_rows():
    source = _find_aptem_next_review_source()
    if not source:
        return []

    schema_sql = _safe_identifier(source["schema"])
    table_sql = _safe_identifier(source["table"])
    full_name_sql = _safe_identifier(source["full_name_col"])
    next_review_sql = _safe_identifier(source["next_review_col"])
    current_review_col = source.get("current_review_col")
    current_review_sql = _safe_identifier(current_review_col) if current_review_col else None

    query = f"""
        SELECT
            {full_name_sql} AS full_name,
            {next_review_sql}::text AS next_review_text,
            {current_review_sql if current_review_sql else 'NULL::text'}::text AS current_review_text
        FROM {schema_sql}.{table_sql}
        WHERE {full_name_sql} IS NOT NULL
    """

    with connection.cursor() as cursor:
        cursor.execute(query)
        rows = cursor.fetchall()

    results = []
    for full_name, next_review_text, current_review_text in rows:
        normalized_name = _norm_booking_identity(full_name)
        if not normalized_name:
            continue
        results.append(
            {
                "fullName": str(full_name).strip(),
                "normalizedName": normalized_name,
                "nextReviewText": str(next_review_text or "").strip(),
                "nextReviewDate": _parse_date_from_text(next_review_text),
                "currentReviewDate": _parse_date_from_text(current_review_text),
            }
        )
    return results


def _find_aptem_next_review_match(review, aptem_rows):
    learner = (review or {}).get("learner") or {}
    learner_name = _norm_booking_identity(learner.get("name"))
    last_review_date = _safe_date(review.get("lastReviewDate"))
    if not learner_name:
        return None

    exact_date_matches = []
    name_matches = []
    for row in aptem_rows:
        if row.get("normalizedName") != learner_name:
            continue
        name_matches.append(row)
        row_current_review_date = row.get("currentReviewDate")
        if last_review_date and row_current_review_date and row_current_review_date == last_review_date:
            exact_date_matches.append(row)

    if exact_date_matches:
        return exact_date_matches[0]
    if name_matches:
        return name_matches[0]
    return None


def _find_explicit_next_booking(review, booking_rows):
    learner = (review or {}).get("learner") or {}
    learner_name = _norm_booking_identity(learner.get("name"))
    learner_email = _norm_name(learner.get("email"))
    last_review_date = _safe_date(review.get("lastReviewDate"))
    if not last_review_date:
        return None

    for booking in booking_rows:
        booking_date = _safe_date(booking.get("bookingDate"))
        if not booking_date or booking_date <= last_review_date:
            continue
        booking_name = _norm_booking_identity(booking.get("learnerName"))
        booking_email = _norm_name(booking.get("learnerEmail"))
        same_name = learner_name and booking_name and learner_name == booking_name
        same_email = learner_email and booking_email and learner_email == booking_email
        if same_name or same_email:
            return booking
    return None


def _next_review_status_from_dates(last_review_date, next_review_date, next_review_text=None):
    if not last_review_date:
        return None

    if next_review_date:
        gap_days = (next_review_date - last_review_date).days
        if gap_days > OVERDUE_DAYS:
            return "OVERDUE"
        if gap_days > AT_RISK_DAYS:
            return "AT_RISK"
        return "BOOKING"

    today = datetime.utcnow().date()
    warning_date = last_review_date + timedelta(days=AT_RISK_DAYS)
    overdue_date = last_review_date + timedelta(days=OVERDUE_DAYS)
    if today >= overdue_date:
        return "OVERDUE"
    if today >= warning_date:
        return "AT_RISK"
    return None


def _first_non_empty(summary_obj, *keys):
    for key in keys:
        value = summary_obj.get(key)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return ""


def _looks_missing_employer(value):
    text = (value or "").strip().lower()
    return not text or text in {
        "not evidenced in transcript",
        "not evidenced",
        "unknown employer",
        "n/a",
        "na",
        "-",
    }


def _contains_not_evidenced_text(value):
    text = str(value or "").strip().lower()
    return "not evidenced" in text


def _contains_transcript_gap_text(value):
    text = str(value or "").strip().lower()
    if not text:
        return False

    transcript_gap_markers = (
        "not evidenced in transcript",
        "no transcript evidence",
        "without transcript detail",
        "without transcript details",
        "in the transcript provided",
        "in the transcript",
        "present in the transcript",
        "reference in the transcript",
        "recorded in the transcript",
        "captured in the transcript",
        "cannot confirm",
        "no evidence of discussion",
        "there is no record",
    )
    return any(marker in text for marker in transcript_gap_markers)


def _summary_requires_zero_duration(summary_value, summary_text_value=None):
    if not _summary_has_transcript_evidence(summary_value, summary_text_value):
        return True

    parsed = summary_value
    if isinstance(parsed, str):
        try:
            parsed = json.loads(parsed)
        except json.JSONDecodeError:
            parsed = None

    if not parsed and isinstance(summary_text_value, str):
        try:
            parsed = json.loads(summary_text_value)
        except json.JSONDecodeError:
            parsed = None

    if not isinstance(parsed, dict):
        return False

    qa_entries = parsed.get("qa")
    if not isinstance(qa_entries, list) or not qa_entries:
        return False

    transcript_gap_hits = 0
    checked_items = 0

    for item in qa_entries:
        if not isinstance(item, dict):
            continue
        checked_items += 1
        candidate_texts = [
            item.get("result"),
            item.get("notes"),
            item.get("comment"),
            item.get("comments"),
        ]
        evidence_entries = item.get("evidence")
        if isinstance(evidence_entries, list):
            for evidence_item in evidence_entries:
                if not isinstance(evidence_item, dict):
                    continue
                candidate_texts.extend(
                    [
                        evidence_item.get("quote"),
                        evidence_item.get("why_it_matters"),
                    ]
                )
        if any(_contains_transcript_gap_text(value) for value in candidate_texts):
            transcript_gap_hits += 1

    if checked_items == 0:
        return False

    return transcript_gap_hits >= min(checked_items, 3)


def _summary_has_transcript_evidence(summary_value, summary_text_value=None):
    parsed = summary_value
    if isinstance(parsed, str):
        try:
            parsed = json.loads(parsed)
        except json.JSONDecodeError:
            parsed = None

    raw_text_candidates = []
    if isinstance(summary_text_value, str):
        raw_text_candidates.append(summary_text_value.strip())
        if not parsed:
            try:
                parsed = json.loads(summary_text_value)
            except json.JSONDecodeError:
                parsed = None

    if isinstance(parsed, dict):
        candidate_parts = []
        for key in ("executive_summary", "professional_judgement", "professionalJudgement"):
            value = parsed.get(key)
            if isinstance(value, str) and value.strip():
                candidate_parts.append(value.strip())

        for key in ("strengths", "areas_for_development"):
            value = parsed.get(key)
            if isinstance(value, list):
                candidate_parts.extend(str(item).strip() for item in value if str(item).strip())

        priority_actions = parsed.get("priority_actions")
        if isinstance(priority_actions, list):
            for item in priority_actions:
                if isinstance(item, str) and item.strip():
                    candidate_parts.append(item.strip())
                elif isinstance(item, dict):
                    action_value = str(item.get("action") or "").strip()
                    if action_value:
                        candidate_parts.append(action_value)

        qa_entries = parsed.get("qa")
        if isinstance(qa_entries, list):
            for item in qa_entries:
                if not isinstance(item, dict):
                    continue
                for key in ("notes", "comment", "comments", "result"):
                    value = item.get(key)
                    if isinstance(value, str) and value.strip():
                        candidate_parts.append(value.strip())
                evidence_entries = item.get("evidence")
                if isinstance(evidence_entries, list):
                    for evidence_item in evidence_entries:
                        if not isinstance(evidence_item, dict):
                            continue
                        for key in ("quote", "why_it_matters"):
                            value = evidence_item.get(key)
                            if isinstance(value, str) and value.strip():
                                candidate_parts.append(value.strip())

        raw_text_candidates.extend(candidate_parts)

    for text in raw_text_candidates:
        normalized = str(text or "").strip()
        if not normalized:
            continue
        lowered = normalized.lower()
        if lowered in {"not evidenced", "not evidenced in transcript", "no transcript evidence available."}:
            continue
        if normalized.startswith("{") or normalized.startswith("["):
            continue
        return True

    return False


def _summary_is_fully_not_evidenced(summary_value, summary_text_value=None):
    if _summary_requires_zero_duration(summary_value, summary_text_value):
        return True

    parsed = summary_value
    if isinstance(parsed, str):
        try:
            parsed = json.loads(parsed)
        except json.JSONDecodeError:
            parsed = None

    if not parsed and isinstance(summary_text_value, str):
        try:
            parsed = json.loads(summary_text_value)
        except json.JSONDecodeError:
            parsed = None

    if not isinstance(parsed, dict):
        return False

    qa_entries = parsed.get("qa")
    if not isinstance(qa_entries, list) or not qa_entries:
        return False
    if len(qa_entries) < len(QA_CRITERIA_TITLES):
        return False

    for item in qa_entries:
        if not isinstance(item, dict):
            return False

        candidate_texts = [
            item.get("result"),
            item.get("notes"),
            item.get("comment"),
            item.get("comments"),
        ]
        evidence_entries = item.get("evidence")
        if isinstance(evidence_entries, list):
            for evidence_item in evidence_entries:
                if isinstance(evidence_item, dict):
                    candidate_texts.extend(
                        [
                            evidence_item.get("quote"),
                            evidence_item.get("why_it_matters"),
                        ]
                    )

        if not any(_contains_not_evidenced_text(value) for value in candidate_texts):
            return False

    return True


def _extract_third_person_name(summary_obj, learner_name, coach_name):
    excluded = {_norm_name(learner_name), _norm_name(coach_name)}
    if "@" in (learner_name or ""):
        local = learner_name.split("@", 1)[0].replace(".", " ").replace("_", " ")
        excluded.add(_norm_name(local))
    candidate_texts = []

    executive_summary = summary_obj.get("executive_summary")
    if isinstance(executive_summary, str):
        candidate_texts.append(executive_summary)

    strengths = summary_obj.get("strengths")
    if isinstance(strengths, list):
        candidate_texts.extend([s for s in strengths if isinstance(s, str)])

    actions = summary_obj.get("priority_actions")
    if isinstance(actions, list):
        candidate_texts.extend([a for a in actions if isinstance(a, str)])

    # Heuristic for person names like "First Last" (and longer full names).
    name_regex = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b")
    banned_phrases = {
        "social media",
        "progress review",
        "tripartite progress",
        "project controls",
    }
    banned_tokens = {"meeting", "review", "progress", "social", "media"}
    role_prefixes = ("coach ", "learner ", "employer ")
    for block in candidate_texts:
        for match in name_regex.findall(block):
            cleaned = match.strip()
            lowered_cleaned = cleaned.lower()
            for prefix in role_prefixes:
                if lowered_cleaned.startswith(prefix):
                    cleaned = cleaned[len(prefix):].strip()
                    lowered_cleaned = cleaned.lower()
                    break

            n = _norm_name(cleaned)
            if n in excluded:
                continue
            if not n:
                continue
            if n in banned_phrases:
                continue
            parts = n.split()
            if len(parts) < 2:
                continue
            if any(p in banned_tokens for p in parts):
                continue
            return cleaned
    return None


def _format_overall_rating(overall_rating):
    if isinstance(overall_rating, dict):
        rag = _coerce_text(overall_rating.get("rag") or overall_rating.get("status"))
        average_rating = overall_rating.get("average_rating")
        if average_rating in (None, ""):
            average_rating = overall_rating.get("averageRating")
        qualitative = _coerce_text(overall_rating.get("qualitative"))

        rating_parts = []
        if rag:
            rating_parts.append(rag)
        if average_rating not in (None, ""):
            rating_parts.append(f"{str(average_rating).strip()}/5")
        if qualitative:
            rating_parts.append(qualitative)
        return " | ".join(part for part in rating_parts if part)

    if isinstance(overall_rating, list):
        return ", ".join(_coerce_text(item) for item in overall_rating if _coerce_text(item))

    text = _coerce_text(overall_rating)
    if text.startswith("{") or text.startswith("["):
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            return text
        return _format_overall_rating(parsed)
    return text


def _overall_judgement_from_summary(summary_obj):
    candidates = [
        summary_obj.get("executive_summary"),
        summary_obj.get("professional_judgement"),
        summary_obj.get("professionalJudgement"),
        summary_obj.get("qualitative"),
    ]
    for candidate in candidates:
        text = _coerce_text(candidate)
        if text:
            return text
    return "Imported from booking summary."


def _fetch_summary_items(limit):
    table_name = _find_summary_table()
    if not table_name:
        return {
            "ok": False,
            "status": 404,
            "payload": {
                "error": "Could not find summary table",
                "expectedTable": SUMMARY_TABLE_NAME,
            },
        }

    with connection.cursor() as cursor:
        safe_table_name = table_name.replace('"', '""')
        quoted_table = f'public."{safe_table_name}"'
        cursor.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = %s
              AND lower(column_name) IN ('summary_json', 'summary_text')
            ORDER BY
              CASE
                WHEN lower(column_name) = 'summary_json' THEN 0
                ELSE 1
              END,
              column_name ASC
            """,
            [table_name],
        )
        available_summary_columns = [row[0] for row in cursor.fetchall()]

        if not available_summary_columns:
            cursor.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = %s
                ORDER BY column_name ASC
                LIMIT 20
                """,
                [table_name],
            )
            available_columns = [row[0] for row in cursor.fetchall()]
            return {
                "ok": False,
                "status": 404,
                "payload": {
                    "error": "Could not find summary_json/summary_text column",
                    "table": table_name,
                    "availableColumns": available_columns,
                },
            }

        summary_json_col = next((col for col in available_summary_columns if col.lower() == "summary_json"), None)
        summary_text_col = next((col for col in available_summary_columns if col.lower() == "summary_text"), None)
        selected_column = summary_json_col or summary_text_col
        safe_column_name = selected_column.replace('"', '""')
        quoted_column = f'"{safe_column_name}"'
        cursor.execute(f"SELECT COUNT(*) FROM {quoted_table}")
        total = cursor.fetchone()[0]
        cursor.execute(
            """
            SELECT {column_name}
            FROM {table_name}
            WHERE {column_name} IS NOT NULL AND TRIM({column_name}) <> ''
            ORDER BY 1 DESC
            LIMIT %s
            """.format(table_name=quoted_table, column_name=quoted_column),
            [limit],
        )
        rows = cursor.fetchall()

    items = []
    for idx, row in enumerate(rows, start=1):
        summary_text = row[0]
        parsed_summary = None
        if isinstance(summary_text, str):
            try:
                parsed_summary = json.loads(summary_text)
            except json.JSONDecodeError:
                parsed_summary = None
        items.append(
            {
                "id": idx,
                "summaryText": summary_text,
                "summaryJson": parsed_summary,
                "sourceColumn": selected_column,
            }
        )

    return {
        "ok": True,
        "status": 200,
        "payload": {
            "table": table_name,
            "total": total,
            "count": len(items),
            "items": items,
        },
    }


def _safe_date(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value.date()
    text = str(value).strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).date()
    except ValueError:
        try:
            return datetime.strptime(text[:10], "%Y-%m-%d").date()
        except ValueError:
            return None


def _review_window_dates(review_date):
    if not review_date:
        return None, None
    return review_date + timedelta(days=AT_RISK_DAYS), review_date + timedelta(days=OVERDUE_DAYS)


def _status_from_timeline(last_completed_date, booking_date):
    today = datetime.utcnow().date()
    if booking_date and (not last_completed_date or booking_date >= last_completed_date):
        return "BOOKING"
    if not last_completed_date:
        return None

    days_since_completed = (today - last_completed_date).days
    if days_since_completed >= OVERDUE_DAYS:
        return "OVERDUE"
    if days_since_completed >= AT_RISK_DAYS:
        return "AT_RISK"
    return "COMPLETED"


def _attendance_from_summary(summary_obj):
    def _to_int(value):
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    employer_name = (
        summary_obj.get("employer")
        or summary_obj.get("manager")
        or summary_obj.get("employer_name")
        or summary_obj.get("manager_name")
        or summary_obj.get("line_manager")
        or summary_obj.get("workplace_manager")
        or ""
    )
    employer_name = str(employer_name).strip()

    # If employer is explicitly marked as not attending, keep it PARTIAL
    # unless we can still infer an actual manager name from the summary.
    if employer_name and _looks_missing_employer(employer_name):
        inferred_third_person = _extract_third_person_name(
            summary_obj,
            summary_obj.get("learner") or "",
            summary_obj.get("coach") or "",
        )
        return "ALL_PRESENT" if inferred_third_person else "PARTIAL"

    # If employer/manager name is available, treat the meeting as fully attended.
    if employer_name:
        return "ALL_PRESENT"

    # If a third person name can be inferred from summary evidence, count as present.
    inferred_third_person = _extract_third_person_name(
        summary_obj,
        summary_obj.get("learner") or "",
        summary_obj.get("coach") or "",
    )
    if inferred_third_person:
        return "ALL_PRESENT"

    # Preferred rule: 3 attendees => ALL_PRESENT, 2 => PARTIAL, else => MISSING.
    for key in ("attendees_present", "attendance_count", "present_count", "participants_present"):
        count = _to_int(summary_obj.get(key))
        if count is not None:
            if count >= 3:
                return "ALL_PRESENT"
            if count == 2:
                return "PARTIAL"
            return "MISSING"

    # Support explicit participant flags when provided.
    participant_keys = [
        ("learner_present", "learner_attended"),
        ("employer_present", "manager_present", "employer_attended"),
        ("coach_present", "skill_coach_present", "coach_attended"),
    ]
    present_count = 0
    seen_flag = False
    for variants in participant_keys:
        flag_value = None
        for key in variants:
            if key in summary_obj:
                flag_value = summary_obj.get(key)
                break
        if flag_value is None:
            continue
        seen_flag = True
        if str(flag_value).strip().lower() in {"1", "true", "yes", "y"}:
            present_count += 1

    if seen_flag:
        if present_count >= 3:
            return "ALL_PRESENT"
        if present_count == 2:
            return "PARTIAL"
        return "MISSING"

    # Backward compatibility with old 1..5 score.
    score = _to_int(summary_obj.get("attendance_score_1_to_5"))
    if score is None:
        return "ALL_PRESENT"
    if score >= 4:
        return "ALL_PRESENT"
    if score >= 2:
        return "PARTIAL"
    return "MISSING"


def _checklist_from_summary(summary_obj):
    if not _summary_has_transcript_evidence(summary_obj):
        return [
            {
                "id": index,
                "category": title,
                "evaluation": "NO",
                "comments": "Not evidenced in transcript",
            }
            for index, title in enumerate(QA_CRITERIA_TITLES, start=1)
        ]

    qa_entries = summary_obj.get("qa")
    checklist = []
    if isinstance(qa_entries, list):
        for index, item in enumerate(qa_entries, start=1):
            if not isinstance(item, dict):
                continue
            rag = str(item.get("rag", "")).strip().lower()
            if rag == "green":
                evaluation = "YES"
            elif rag == "amber":
                evaluation = "PARTIAL"
            else:
                evaluation = "NO"
            category = (
                item.get("criterion")
                or item.get("title")
                or item.get("metric")
                or item.get("category")
                or (QA_CRITERIA_TITLES[index - 1] if index - 1 < len(QA_CRITERIA_TITLES) else f"Criterion {index}")
            )
            comments = (
                item.get("comments")
                or item.get("comment")
                or item.get("note")
                or item.get("notes")
                or ""
            )
            checklist.append(
                {
                    "id": index,
                    "category": category,
                    "evaluation": evaluation,
                    "comments": comments,
                }
            )

    if checklist:
        return checklist

    return [
        {
            "id": 1,
            "category": QA_CRITERIA_TITLES[0],
            "evaluation": "YES",
            "comments": "Imported from booking summary",
        }
    ]


def _fetch_completed_progress_reviews(limit):
    table_name = _find_summary_table()
    if not table_name:
        return {
            "ok": False,
            "status": 404,
            "payload": {"error": "Summary table was not found", "expectedTable": SUMMARY_TABLE_NAME},
        }

    with connection.cursor() as cursor:
        safe_table = table_name.replace('"', '""')
        quoted_table = f'public."{safe_table}"'

        cursor.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema='public' AND table_name=%s
            """,
            [table_name],
        )
        cols = {row[0].lower(): row[0] for row in cursor.fetchall()}

        id_col = cols.get("id")
        status_col = cols.get("status_text")
        summary_json_col = cols.get("summary_json")
        summary_text_col = cols.get("summary_text")
        learner_email_col = (
            cols.get("learner_email")
            or cols.get("learneremail")
            or cols.get("email")
        )
        learner_phone_col = (
            cols.get("learner_phone")
            or cols.get("learnerphone")
            or cols.get("phone")
            or cols.get("phone_number")
            or cols.get("telephone")
        )
        planned_otj_col = cols.get("planned")
        submitted_otj_col = cols.get("submitted")
        expected_otj_col = cols.get("expected")
        otj_hours_status_col = cols.get("otjhoursstatus")

        if not summary_json_col and not summary_text_col:
            return {
                "ok": False,
                "status": 404,
                "payload": {"error": "No summary_json/summary_text column found", "table": table_name},
            }

        select_parts = []
        if id_col:
            select_parts.append(f'"{id_col}" AS row_id')
        else:
            select_parts.append("ROW_NUMBER() OVER () AS row_id")
        if status_col:
            select_parts.append(f'"{status_col}" AS status_text')
        else:
            select_parts.append("NULL::text AS status_text")
        if summary_json_col:
            select_parts.append(f'"{summary_json_col}"::text AS summary_json_text')
        else:
            select_parts.append("NULL::text AS summary_json_text")
        if summary_text_col:
            select_parts.append(f'"{summary_text_col}" AS summary_text')
        else:
            select_parts.append("NULL::text AS summary_text")
        if learner_email_col:
            select_parts.append(f'"{learner_email_col}" AS learner_email_col')
        else:
            select_parts.append("NULL::text AS learner_email_col")
        if learner_phone_col:
            select_parts.append(f'"{learner_phone_col}" AS learner_phone_col')
        else:
            select_parts.append("NULL::text AS learner_phone_col")
        if planned_otj_col:
            select_parts.append(f'"{planned_otj_col}" AS planned_otj_col')
        else:
            select_parts.append("NULL::numeric AS planned_otj_col")
        if submitted_otj_col:
            select_parts.append(f'"{submitted_otj_col}" AS submitted_otj_col')
        else:
            select_parts.append("NULL::numeric AS submitted_otj_col")
        if expected_otj_col:
            select_parts.append(f'"{expected_otj_col}" AS expected_otj_col')
        else:
            select_parts.append("NULL::numeric AS expected_otj_col")
        if otj_hours_status_col:
            select_parts.append(f'"{otj_hours_status_col}" AS otj_hours_status_col')
        else:
            select_parts.append("NULL::text AS otj_hours_status_col")

        query = f"""
            SELECT {', '.join(select_parts)}
            FROM {quoted_table}
            WHERE ({'"' + summary_json_col + '"' if summary_json_col else 'NULL'}) IS NOT NULL
               OR ({'"' + summary_text_col + '"' if summary_text_col else 'NULL'}) IS NOT NULL
            ORDER BY row_id DESC
        """
        params = []
        if limit is not None:
            query += "\n            LIMIT %s"
            params.append(limit)
        cursor.execute(query, params)
        rows = cursor.fetchall()

    reviews = []
    for row in rows:
        (
            row_id,
            status_text,
            summary_json_text,
            summary_text,
            learner_email_col_value,
            learner_phone_col_value,
            planned_otj_col_value,
            submitted_otj_col_value,
            expected_otj_col_value,
            otj_hours_status_col_value,
        ) = row
        summary_obj = {}
        if summary_json_text:
            try:
                summary_obj = json.loads(summary_json_text)
            except json.JSONDecodeError:
                summary_obj = {}
        if not summary_obj and isinstance(summary_text, str):
            try:
                summary_obj = json.loads(summary_text)
            except json.JSONDecodeError:
                summary_obj = {}

        review_date = _safe_date(summary_obj.get("date")) or datetime.utcnow().date()
        meeting_date = review_date
        warning_date = meeting_date + timedelta(weeks=10)
        due_date = meeting_date + timedelta(weeks=12)
        attendance = _attendance_from_summary(summary_obj)
        duration_minutes = summary_obj.get("duration_inferred_minutes")
        if not duration_minutes:
            duration_minutes = _parse_duration_minutes(summary_obj.get("duration"))
        group_name = summary_obj.get("group") or summary_obj.get("Group") or "Unknown Group"
        learner_name = summary_obj.get("learner") or f"Learner {row_id}"
        learner_email = str(learner_email_col_value or "").strip() or _first_non_empty(
            summary_obj,
            "learner_email",
            "email",
            "learnerEmail",
            "learner_email_address",
        ) or f"learner{row_id}@example.com"
        learner_phone = str(learner_phone_col_value or "").strip() or _first_non_empty(
            summary_obj,
            "learner_phone",
            "phone",
            "mobile",
            "mobile_phone",
            "mobile_number",
            "phone_number",
            "telephone",
            "telephone_number",
            "learnerPhone",
        )
        coach_name = summary_obj.get("coach") or "Unknown Coach"
        employer_name = summary_obj.get("employer") or MISSING_EMPLOYER_LABEL
        if _looks_missing_employer(employer_name):
            inferred_third_person = _extract_third_person_name(summary_obj, learner_name, coach_name)
            if inferred_third_person:
                employer_name = inferred_third_person
            else:
                employer_name = MISSING_EMPLOYER_LABEL
        strengths = summary_obj.get("strengths") if isinstance(summary_obj.get("strengths"), list) else []
        priority_actions = (
            summary_obj.get("priority_actions")
            if isinstance(summary_obj.get("priority_actions"), list)
            else []
        )
        mapped_actions = []
        for i, action_text in enumerate(priority_actions, start=1):
            owner = "COACH"
            action_value = ""
            due_value = due_date.isoformat()
            if isinstance(action_text, dict):
                action_value = str(action_text.get("action") or "").strip()
                owner_value = str(action_text.get("owner") or "").strip()
                if owner_value:
                    owner = owner_value
                due_raw = action_text.get("due")
                due_parsed = _safe_date(due_raw)
                if due_parsed:
                    due_value = due_parsed.isoformat()
            elif isinstance(action_text, str):
                action_value = action_text.strip()
            if not action_value:
                continue
            mapped_actions.append(
                {
                    "id": f"{row_id}-act-{i}",
                    "owner": owner,
                    "action": action_value,
                    "dueDate": due_value,
                    "status": "OPEN",
                }
            )
        areas = (
            summary_obj.get("areas_for_development")
            if isinstance(summary_obj.get("areas_for_development"), list)
            else []
        )
        if not areas and mapped_actions:
            areas = [a["action"] for a in mapped_actions[:3]]
        status = "COMPLETED"
        explicit_sign_off = any(
            str(summary_obj.get(key) or "").strip().lower() in {"1", "true", "yes", "y", "signed", "complete"}
            for key in (
                "signed_off",
                "signedOff",
                "sign_off",
                "learner_signed",
                "employer_signed",
                "coach_signed",
            )
        )
        signed_off = explicit_sign_off or str(status_text or "").lower() in ("ok", "success") or status == "COMPLETED"

        reviews.append(
            {
                "id": str(row_id),
                "learner": {
                    "id": f"learner-{row_id}",
                    "name": learner_name,
                    "email": learner_email,
                    "phone": learner_phone,
                },
                "employer": {"name": employer_name, "email": ""},
                "coach": {"id": f"coach-{row_id}", "name": coach_name, "email": ""},
                "programme": summary_obj.get("programme") or "Unknown Programme",
                "group": group_name,
                "lastReviewDate": meeting_date.isoformat(),
                "meetingDate": meeting_date.isoformat(),
                "nextDueDate": due_date.isoformat(),
                "warningDate": warning_date.isoformat(),
                "status": status,
                "duration": duration_minutes,
                "attendance": attendance,
                "checklist": _checklist_from_summary(summary_obj),
                "otjHours": int(summary_obj.get("otj_hours") or 0),
                "otjNotes": "",
                "plannedOtj": _to_number(planned_otj_col_value),
                "submittedOtj": _to_number(submitted_otj_col_value),
                "expectedOtj": _to_number(expected_otj_col_value),
                "otjHoursStatus": _coerce_text(otj_hours_status_col_value),
                "riskLevel": "HIGH" if status == "OVERDUE" else "MEDIUM" if status == "AT_RISK" else "LOW",
                "riskNotes": summary_obj.get("risk_notes") or "",
                "actions": mapped_actions,
                "strengths": strengths,
                "areasForDevelopment": areas,
                "overallJudgement": _overall_judgement_from_summary(summary_obj),
                "learnerConfirmed": signed_off,
                "employerConfirmed": signed_off,
                "coachConfirmed": signed_off,
                "signedOff": signed_off,
                "createdAt": f"{meeting_date.isoformat()}T09:00:00Z",
                "updatedAt": f"{meeting_date.isoformat()}T09:00:00Z",
                "reportText": summary_text if isinstance(summary_text, str) else "",
                "overallRating": _format_overall_rating(summary_obj.get("overall_rating")),
            }
        )

    return {"ok": True, "status": 200, "payload": {"table": table_name, "reviews": reviews}}


def _fetch_latest_booking_sessions(limit):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND lower(table_name) = 'booking_sessions'
            LIMIT 1
            """
        )
        table_row = cursor.fetchone()
        if not table_row:
            return {"ok": True, "status": 200, "payload": {"table": None, "bookings": []}}

        table_name = table_row[0].replace('"', '""')
        cursor.execute(
            f'''
            SELECT id, day_date, customer_name, customer_email, staff_names, staff_emails,
                   service_name, meeting_subject, duration_seconds, total_participant_count
            FROM public."{table_name}"
            WHERE customer_name IS NOT NULL AND TRIM(customer_name) <> ''
            ORDER BY day_date DESC, id DESC
            LIMIT %s
            ''',
            [max(limit * 5, 500)],
        )
        rows = cursor.fetchall()

    bookings = []
    for row in rows:
        (
            row_id,
            booking_date,
            learner_name,
            learner_email,
            staff_names,
            staff_emails,
            service_name,
            meeting_subject,
            duration_seconds,
            participant_count,
        ) = row
        bookings.append(
            {
                "id": str(row_id),
                "bookingDate": booking_date.isoformat() if booking_date else None,
                "learnerName": (learner_name or "").strip(),
                "learnerEmail": (learner_email or "").strip(),
                "coachName": (staff_names or "").strip() or "Unknown Coach",
                "coachEmail": (staff_emails or "").strip(),
                "serviceName": (service_name or "").strip(),
                "meetingSubject": (meeting_subject or "").strip(),
                "durationMinutes": round((duration_seconds or 0) / 60) if duration_seconds else None,
                "participantCount": int(participant_count or 0),
            }
        )

    return {"ok": True, "status": 200, "payload": {"table": "booking_sessions", "bookings": bookings}}


def _fetch_coach_transcript_stats(coach_name=None, date_from=None, date_to=None):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND lower(table_name) = lower(%s)
            )
            """,
            [SUMMARY_TABLE_NAME],
        )
        summary_table_exists = bool(cursor.fetchone()[0])
        if not summary_table_exists:
            return {
                "ok": False,
                "status": 404,
                "payload": {"error": "Summary table was not found", "expectedTable": SUMMARY_TABLE_NAME},
            }

        filters = [
            "(summary_json IS NOT NULL OR (summary_text IS NOT NULL AND BTRIM(summary_text) <> ''))",
        ]
        params = []

        base_where = " AND ".join(filters)

        cursor.execute(
            f'''
            SELECT
                id,
                booking_id,
                summary_json::text AS summary_json_text,
                summary_text
            FROM public."{SUMMARY_TABLE_NAME}"
            WHERE {base_where}
            ORDER BY created_at DESC NULLS LAST, id DESC
            ''',
            params,
        )
        raw_rows = cursor.fetchall()

    aggregated = {}
    for row_id, booking_id, summary_json_text, summary_text_value in raw_rows:
        summary_obj = {}
        if summary_json_text:
            try:
                summary_obj = json.loads(summary_json_text)
            except json.JSONDecodeError:
                summary_obj = {}
        if not summary_obj and isinstance(summary_text_value, str):
            try:
                summary_obj = json.loads(summary_text_value)
            except json.JSONDecodeError:
                summary_obj = {}

        normalized_coach = (summary_obj.get("coach") or "").strip()
        meeting_date = _safe_date(summary_obj.get("date"))
        if date_from and meeting_date and meeting_date < date_from:
            continue
        if date_to and meeting_date and meeting_date > date_to:
            continue
        if date_from and not meeting_date:
            continue
        if date_to and not meeting_date:
            continue
        if not normalized_coach:
            continue
        if coach_name and normalized_coach.lower() != coach_name.lower():
            continue

        learner_name = (summary_obj.get("learner") or "").strip() or f"Learner {row_id}"
        duration_minutes = summary_obj.get("duration_inferred_minutes")
        if not isinstance(duration_minutes, (int, float)):
            duration_minutes = _parse_duration_minutes(summary_obj.get("duration"))

        coach_state = aggregated.setdefault(
            normalized_coach,
            {
                "durationValues": [],
                "missingSessions": [],
                "sessionCount": 0,
            },
        )

        is_fully_not_evidenced = _summary_requires_zero_duration(summary_json_text, summary_text_value)

        coach_state["sessionCount"] += 1
        if not is_fully_not_evidenced and isinstance(duration_minutes, (int, float)):
            coach_state["durationValues"].append(float(duration_minutes))

        if is_fully_not_evidenced:
            coach_state["missingSessions"].append(
                {
                    "bookingId": booking_id or str(row_id),
                    "meetingDate": meeting_date.isoformat() if meeting_date else None,
                    "learnerName": learner_name,
                    "durationMinutes": 0.0,
                }
            )

    stats = []
    for coach in sorted(aggregated.keys()):
        coach_state = aggregated[coach]
        duration_values = coach_state["durationValues"]
        average_duration = round(sum(duration_values) / len(duration_values), 1) if duration_values else 0.0
        stats.append(
            {
                "coachName": coach,
                "averageDurationMinutes": average_duration,
                "sessionCount": coach_state["sessionCount"],
                "transcriptMissingCount": len(coach_state["missingSessions"]),
                "missingSessions": coach_state["missingSessions"],
            }
        )

    return {
        "ok": True,
        "status": 200,
        "payload": {
            "table": SUMMARY_TABLE_NAME,
            "summaryTable": SUMMARY_TABLE_NAME,
            "rows": stats,
        },
    }


def _fetch_progress_reviews(limit):
    completed_result = _fetch_completed_progress_reviews(limit)
    if not completed_result["ok"]:
        return completed_result
    reviews = completed_result["payload"].get("reviews") or []

    reviews.sort(
        key=lambda review: (
            review.get("coach", {}).get("name") or "",
            review.get("learner", {}).get("name") or "",
        )
    )
    return {
        "ok": True,
        "status": 200,
        "payload": {
            "table": completed_result["payload"].get("table"),
            "reviews": reviews if limit is None else reviews[:limit],
        },
    }


def _parse_optional_limit(raw_limit, default_limit, max_limit):
    text = str(raw_limit or "").strip().lower()
    if not text:
        return default_limit
    if text == "all":
        return None
    try:
        return max(1, min(int(text), max_limit))
    except ValueError:
        raise ValueError("limit must be a number or 'all'")


def _aggregate_session_report(reviews):
    total_sessions = len(reviews)
    unique_learners = set()
    unique_coaches = set()
    status_counts = {"COMPLETED": 0, "BOOKING": 0, "AT_RISK": 0, "OVERDUE": 0}
    attendance_counts = {"ALL_PRESENT": 0, "PARTIAL": 0, "MISSING": 0}
    checklist_counts = {"YES": 0, "PARTIAL": 0, "NO": 0}
    coach_counts = {}
    programme_counts = {}
    group_counts = {}
    duration_values = []
    first_review = None
    last_review = None
    high_risk_sessions = []

    for review in reviews:
        learner_name = (((review or {}).get("learner") or {}).get("name") or "").strip()
        coach_name = (((review or {}).get("coach") or {}).get("name") or "").strip() or "Unknown Coach"
        programme = (review.get("programme") or "").strip() or "Unknown Programme"
        group_name = (review.get("group") or "").strip() or "Unknown Group"
        status = (review.get("status") or "").strip()
        attendance = (review.get("attendance") or "").strip()
        duration = review.get("duration")
        last_review_date = _safe_date(review.get("lastReviewDate"))

        if learner_name:
            unique_learners.add(learner_name)
        unique_coaches.add(coach_name)

        coach_counts[coach_name] = coach_counts.get(coach_name, 0) + 1
        programme_counts[programme] = programme_counts.get(programme, 0) + 1
        group_counts[group_name] = group_counts.get(group_name, 0) + 1

        if status in status_counts:
            status_counts[status] += 1
        if attendance in attendance_counts:
            attendance_counts[attendance] += 1

        if isinstance(duration, (int, float)):
            duration_values.append(float(duration))

        for item in review.get("checklist") or []:
            evaluation = (item.get("evaluation") or "").strip()
            if evaluation in checklist_counts:
                checklist_counts[evaluation] += 1

        if status in ("AT_RISK", "OVERDUE"):
            high_risk_sessions.append(
                {
                    "id": review.get("id"),
                    "learner": learner_name or "Unknown Learner",
                    "coach": coach_name,
                    "programme": programme,
                    "group": group_name,
                    "status": status,
                    "lastReviewDate": review.get("lastReviewDate"),
                    "nextDueDate": review.get("nextDueDate"),
                }
            )

        if last_review_date:
            if first_review is None or last_review_date < first_review:
                first_review = last_review_date
            if last_review is None or last_review_date > last_review:
                last_review = last_review_date

    checklist_total = checklist_counts["YES"] + checklist_counts["PARTIAL"] + checklist_counts["NO"]
    compliance_score = 0
    if checklist_total > 0:
        compliance_score = round(
            ((checklist_counts["YES"] + (checklist_counts["PARTIAL"] * 0.5)) / checklist_total) * 100,
            1,
        )

    average_duration = round(sum(duration_values) / len(duration_values), 1) if duration_values else 0
    attendance_compliance = round((attendance_counts["ALL_PRESENT"] / total_sessions) * 100, 1) if total_sessions else 0

    top_coaches = sorted(coach_counts.items(), key=lambda x: (-x[1], x[0]))[:5]
    top_programmes = sorted(programme_counts.items(), key=lambda x: (-x[1], x[0]))[:5]
    top_groups = sorted(group_counts.items(), key=lambda x: (-x[1], x[0]))[:5]

    report_lines = [
        "Session Report (Aggregated)",
        f"Total sessions: {total_sessions}",
        f"Unique learners: {len(unique_learners)}",
        f"Unique coaches: {len(unique_coaches)}",
        (
            f"Review period: {first_review.isoformat()} to {last_review.isoformat()}"
            if first_review and last_review
            else "Review period: Not available"
        ),
        (
            f"Status split - Completed: {status_counts['COMPLETED']}, Booking: {status_counts['BOOKING']}, "
            f"At Risk: {status_counts['AT_RISK']}, Overdue: {status_counts['OVERDUE']}"
        ),
        (
            f"Attendance - All present: {attendance_counts['ALL_PRESENT']}, "
            f"Partial: {attendance_counts['PARTIAL']}, Missing: {attendance_counts['MISSING']}"
        ),
        f"Average session duration: {average_duration} minutes",
        f"Checklist weighted compliance score: {compliance_score}%",
        f"High-risk sessions (At Risk + Overdue): {len(high_risk_sessions)}",
    ]

    return {
        "summary": {
            "totalSessions": total_sessions,
            "uniqueLearners": len(unique_learners),
            "uniqueCoaches": len(unique_coaches),
            "reviewPeriod": {
                "from": first_review.isoformat() if first_review else None,
                "to": last_review.isoformat() if last_review else None,
            },
            "statusCounts": status_counts,
            "attendanceCounts": attendance_counts,
            "attendanceCompliancePercent": attendance_compliance,
            "averageDurationMinutes": average_duration,
            "checklistCounts": checklist_counts,
            "checklistWeightedCompliancePercent": compliance_score,
            "highRiskCount": len(high_risk_sessions),
        },
        "topCoaches": [{"name": name, "sessions": count} for name, count in top_coaches],
        "topProgrammes": [{"name": name, "sessions": count} for name, count in top_programmes],
        "topGroups": [{"name": name, "sessions": count} for name, count in top_groups],
        "highRiskSessions": high_risk_sessions,
        "reportText": "\n".join(report_lines),
    }


@require_GET
def dashboard_booking_summaries(request):
    raw_limit = request.GET.get("limit", "20")
    try:
        limit = max(1, min(int(raw_limit), 200))
    except ValueError:
        return JsonResponse({"error": "limit must be a number"}, status=400)

    result = _fetch_summary_items(limit)
    return JsonResponse(result["payload"], status=result["status"])


@require_GET
def dashboard_kpis(request):
    return JsonResponse(
        {
            "totalLearnersInScope": 42,
            "reviewsDueSoon": 12,
            "overdueReviews": 5,
            "completedThisMonth": 18,
            "complianceRate": 89,
        }
    )


@require_GET
def dashboard_due_soon(request):
    return JsonResponse([], safe=False)


@require_GET
def dashboard_overdue(request):
    return JsonResponse([], safe=False)


@require_GET
def dashboard_status_counts(request):
    return JsonResponse(
        {
            "notStarted": 10,
            "dueSoon": 12,
            "overdue": 5,
            "completed": 15,
        }
    )


@require_GET
def dashboard_weekly_trend(request):
    return JsonResponse(
        [
            {"weekLabel": "08 Dec", "completedCount": 2},
            {"weekLabel": "15 Dec", "completedCount": 3},
            {"weekLabel": "22 Dec", "completedCount": 2},
            {"weekLabel": "29 Dec", "completedCount": 1},
            {"weekLabel": "05 Jan", "completedCount": 4},
            {"weekLabel": "12 Jan", "completedCount": 3},
            {"weekLabel": "19 Jan", "completedCount": 5},
            {"weekLabel": "26 Jan", "completedCount": 4},
            {"weekLabel": "02 Feb", "completedCount": 6},
            {"weekLabel": "09 Feb", "completedCount": 5},
            {"weekLabel": "16 Feb", "completedCount": 7},
            {"weekLabel": "23 Feb", "completedCount": 6},
        ],
        safe=False,
    )


@require_GET
def dashboard_recent_reviews(request):
    result = _fetch_summary_items(10)
    if not result["ok"]:
        return JsonResponse(result["payload"], status=result["status"])

    reviews = []
    for index, item in enumerate(result["payload"]["items"], start=1):
        summary = item.get("summaryJson") or {}
        learner_name = summary.get("learner") or f"Learner {index}"
        coach_name = summary.get("coach") or "Coach"
        employer_name = summary.get("employer") or MISSING_EMPLOYER_LABEL
        if _looks_missing_employer(employer_name):
            inferred_third_person = _extract_third_person_name(summary, learner_name, coach_name)
            employer_name = inferred_third_person or MISSING_EMPLOYER_LABEL
        review_date = summary.get("date") or "2026-01-01"
        duration_minutes = summary.get("duration_inferred_minutes") or _parse_duration_minutes(summary.get("duration"))
        review_id = f"booking-{index}"
        reviews.append(
            {
                "id": review_id,
                "programme": summary.get("programme") or "Unknown Programme",
                "group": summary.get("group") or "Unknown Group",
                "learner": {
                    "id": review_id,
                    "name": learner_name,
                    "email": "unknown@example.com",
                },
                "employer": {
                    "name": employer_name,
                    "email": "unknown@example.com",
                },
                "coach": {
                    "id": review_id,
                    "name": coach_name,
                    "email": "unknown@example.com",
                },
                "reviewDateTime": f"{review_date}T09:00:00Z",
                "dueDateTime": f"{review_date}T10:00:00Z",
                "durationMinutes": duration_minutes,
                "otjHoursReviewed": 0,
                "otjHoursValue": 0,
                "strengths": summary.get("executive_summary") or "",
                "areasForDevelopment": "",
                "overallJudgement": "Imported from booking summary",
                "signOff": {
                    "learnerSignedAt": f"{review_date}T11:00:00Z",
                    "employerSignedAt": f"{review_date}T11:00:00Z",
                    "coachSignedAt": f"{review_date}T11:00:00Z",
                },
                "createdAt": f"{review_date}T09:00:00Z",
                "updatedAt": f"{review_date}T11:00:00Z",
                "complianceScorePercent": 100,
                "riskFlags": [],
                "signOffComplete": True,
            }
        )

    return JsonResponse(reviews, safe=False)


@require_GET
def progress_reviews_overview(request):
    raw_limit = request.GET.get("limit", "all")
    try:
        limit = _parse_optional_limit(raw_limit, default_limit=500, max_limit=2000)
    except ValueError:
        return JsonResponse({"error": "limit must be a number or 'all'"}, status=400)

    result = _fetch_progress_reviews(limit)
    return JsonResponse(result["payload"], status=result["status"])


@require_GET
def progress_reviews_otj_snapshot(request):
    learner_name = request.GET.get("learnerName", "")
    learner_email = request.GET.get("learnerEmail", "")
    programme = request.GET.get("programme", "")

    result = _fetch_otj_snapshot(
        learner_name=learner_name,
        learner_email=learner_email,
        programme=programme,
    )
    return JsonResponse(result["payload"], status=result["status"])


@require_GET
def progress_reviews_session_report(request):
    raw_limit = request.GET.get("limit", "all")
    try:
        limit = _parse_optional_limit(raw_limit, default_limit=2000, max_limit=5000)
    except ValueError:
        return JsonResponse({"error": "limit must be a number or 'all'"}, status=400)

    result = _fetch_completed_progress_reviews(limit)
    if not result["ok"]:
        return JsonResponse(result["payload"], status=result["status"])

    reviews = result["payload"].get("reviews") or []
    aggregated = _aggregate_session_report(reviews)
    payload = {
        "table": result["payload"].get("table"),
        "sourceCount": len(reviews),
        **aggregated,
    }
    return JsonResponse(payload, status=200)


@require_GET
def progress_reviews_coach_transcript_stats(request):
    coach_name = (request.GET.get("coach") or "").strip()
    raw_date_from = (request.GET.get("dateFrom") or "").strip()
    raw_date_to = (request.GET.get("dateTo") or "").strip()

    date_from = _safe_date(raw_date_from) if raw_date_from else None
    date_to = _safe_date(raw_date_to) if raw_date_to else None

    if raw_date_from and not date_from:
        return JsonResponse({"error": "dateFrom must be a valid date"}, status=400)
    if raw_date_to and not date_to:
        return JsonResponse({"error": "dateTo must be a valid date"}, status=400)
    if date_from and date_to and date_from > date_to:
        date_from, date_to = date_to, date_from

    result = _fetch_coach_transcript_stats(
        coach_name=coach_name or None,
        date_from=date_from,
        date_to=date_to,
    )
    return JsonResponse(result["payload"], status=result["status"])
