import { LearnerWithStatus } from '../../../shared/types/learner';
import Badge from '../../../shared/components/Badge';
import { getStatusColour, formatStatus } from '../../../backend/utils/review-cycle';

interface LearnerHeaderProps {
  learner: LearnerWithStatus;
}

export function LearnerHeader({ learner }: LearnerHeaderProps) {
  const { cycleStatus } = learner;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">{learner.name}</h1>
          <p className="text-sm text-gray-500">{learner.email}</p>
        </div>
        <Badge className={getStatusColour(cycleStatus.status)}>
          {formatStatus(cycleStatus.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Learner Details */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Learner Details</h3>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-500">Programme</p>
              <p className="text-sm font-medium text-gray-900">{learner.programme}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Group</p>
              <p className="text-sm font-medium text-gray-900">{learner.group}</p>
            </div>
          </div>
        </div>

        {/* Skills Coach */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Skills Coach</h3>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-gray-900">{learner.coachName}</p>
              <p className="text-xs text-gray-500">{learner.coachEmail}</p>
            </div>
          </div>
        </div>

        {/* Employer / Line Manager */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Employer / Line Manager</h3>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-gray-900">{learner.employerName}</p>
              <p className="text-xs text-gray-500">{learner.employerEmail}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LearnerHeader;
