import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../api/settings-api';
import { mockSettingsApi } from '../../../backend/mock/mock-settings';
import type { SystemSettings } from '../../../shared/types/settings';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { useToast } from '../../../shared/hooks/useToast';

const useMockData = import.meta.env.VITE_USE_MOCK === 'true';
const api = useMockData ? mockSettingsApi : settingsApi;

type SettingsTab = 'cycle' | 'notifications' | 'checklist';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('cycle');
  const [hasChanges, setHasChanges] = useState(false);

  const { data: settings, isLoading, error, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
  });

  const [localSettings, setLocalSettings] = useState<SystemSettings | null>(null);

  // Initialize local settings when data loads
  if (settings && !localSettings) {
    setLocalSettings(JSON.parse(JSON.stringify(settings)));
  }

  const updateMutation = useMutation({
    mutationFn: (updatedSettings: Partial<SystemSettings>) => api.updateSettings(updatedSettings),
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
      setLocalSettings(JSON.parse(JSON.stringify(data)));
      setHasChanges(false);
      showToast('Settings saved successfully', 'success');
    },
    onError: () => {
      showToast('Failed to save settings', 'error');
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => api.resetToDefaults(),
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
      setLocalSettings(JSON.parse(JSON.stringify(data)));
      setHasChanges(false);
      showToast('Settings reset to defaults', 'success');
    },
    onError: () => {
      showToast('Failed to reset settings', 'error');
    },
  });

  const handleSave = () => {
    if (localSettings) {
      updateMutation.mutate(localSettings);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      resetMutation.mutate();
    }
  };

  const handleCancel = () => {
    if (settings) {
      setLocalSettings(JSON.parse(JSON.stringify(settings)));
      setHasChanges(false);
    }
  };

  const updateLocalSettings = (updates: Partial<SystemSettings>) => {
    if (localSettings) {
      setLocalSettings({ ...localSettings, ...updates });
      setHasChanges(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !localSettings) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <i className="ri-error-warning-line text-4xl text-red-600 mb-3"></i>
          <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Settings</h3>
          <p className="text-red-700 mb-4">There was an error loading system settings.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">System Settings</h1>
        <p className="text-gray-600">Configure review cycle, notifications, and quality assurance checklist</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('cycle')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'cycle'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <i className="ri-calendar-line mr-2"></i>
            Review Cycle
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <i className="ri-notification-line mr-2"></i>
            Email Notifications
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'checklist'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <i className="ri-checkbox-line mr-2"></i>
            QA Checklist
          </button>
        </nav>
      </div>

      {/* Review Cycle Settings */}
      {activeTab === 'cycle' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Review Cycle Configuration</h2>
            <p className="text-sm text-gray-600 mb-6">
              Configure the review cadence and reminder windows for tripartite progress reviews.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Cycle Duration (weeks)
                </label>
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={localSettings.reviewCycle.cycleDurationWeeks}
                  onChange={(e) =>
                    updateLocalSettings({
                      reviewCycle: {
                        ...localSettings.reviewCycle,
                        cycleDurationWeeks: parseInt(e.target.value) || 10,
                      },
                    })
                  }
                  className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Expected time between reviews (default: 10 weeks / 70 days)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Reminder Window Start (weeks)
                </label>
                <input
                  type="number"
                  min="1"
                  max={localSettings.reviewCycle.cycleDurationWeeks}
                  value={localSettings.reviewCycle.reminderWindowWeeks}
                  onChange={(e) =>
                    updateLocalSettings({
                      reviewCycle: {
                        ...localSettings.reviewCycle,
                        reminderWindowWeeks: parseInt(e.target.value) || 8,
                      },
                    })
                  }
                  className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  When to start showing "Due soon" alerts (default: 8 weeks / 56 days)
                </p>
              </div>

              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.reviewCycle.autoRemindersEnabled}
                    onChange={(e) =>
                      updateLocalSettings({
                        reviewCycle: {
                          ...localSettings.reviewCycle,
                          autoRemindersEnabled: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    Enable automatic reminders
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Automatically send email reminders to all parties
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Reminder Schedule (days before due date)
                </label>
                <div className="flex flex-wrap gap-2">
                  {[14, 7, 3, 1].map((days) => (
                    <label key={days} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.reviewCycle.reminderDaysBefore.includes(days)}
                        onChange={(e) => {
                          const current = localSettings.reviewCycle.reminderDaysBefore;
                          const updated = e.target.checked
                            ? [...current, days].sort((a, b) => b - a)
                            : current.filter((d) => d !== days);
                          updateLocalSettings({
                            reviewCycle: {
                              ...localSettings.reviewCycle,
                              reminderDaysBefore: updated,
                            },
                          });
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{days} days</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Send reminders at these intervals before the due date
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <i className="ri-information-line text-xl text-blue-600 mt-0.5"></i>
              <div>
                <h3 className="text-sm font-semibold text-blue-900 mb-1">How Review Cycles Work</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Reviews are expected every {localSettings.reviewCycle.cycleDurationWeeks} weeks from the last completed review</li>
                  <li>• "Due soon" alerts appear {localSettings.reviewCycle.reminderWindowWeeks} weeks after the last review</li>
                  <li>• Reviews become "Overdue" after {localSettings.reviewCycle.cycleDurationWeeks} weeks</li>
                  <li>• All three parties (Learner, Coach, Employer) receive reminders</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Notifications Settings */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Email Notification Settings</h2>
            <p className="text-sm text-gray-600 mb-6">
              Configure which email notifications are sent automatically to participants.
            </p>

            <div className="space-y-4">
              <label className="flex items-start cursor-pointer p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={localSettings.emailNotifications.dueSoonEnabled}
                  onChange={(e) =>
                    updateLocalSettings({
                      emailNotifications: {
                        ...localSettings.emailNotifications,
                        dueSoonEnabled: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                />
                <div className="ml-3 flex-1">
                  <span className="text-sm font-medium text-gray-900">Review Due Soon</span>
                  <p className="text-xs text-gray-600 mt-1">
                    Notify all parties when a review enters the reminder window
                  </p>
                </div>
              </label>

              <label className="flex items-start cursor-pointer p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={localSettings.emailNotifications.overdueEnabled}
                  onChange={(e) =>
                    updateLocalSettings({
                      emailNotifications: {
                        ...localSettings.emailNotifications,
                        overdueEnabled: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                />
                <div className="ml-3 flex-1">
                  <span className="text-sm font-medium text-gray-900">Review Overdue</span>
                  <p className="text-xs text-gray-600 mt-1">
                    Send urgent notifications when reviews become overdue
                  </p>
                </div>
              </label>

              <label className="flex items-start cursor-pointer p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={localSettings.emailNotifications.signOffReminderEnabled}
                  onChange={(e) =>
                    updateLocalSettings({
                      emailNotifications: {
                        ...localSettings.emailNotifications,
                        signOffReminderEnabled: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                />
                <div className="ml-3 flex-1">
                  <span className="text-sm font-medium text-gray-900">Sign-off Reminder</span>
                  <p className="text-xs text-gray-600 mt-1">
                    Remind parties to sign off completed reviews
                  </p>
                </div>
              </label>

              <label className="flex items-start cursor-pointer p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={localSettings.emailNotifications.actionDueEnabled}
                  onChange={(e) =>
                    updateLocalSettings({
                      emailNotifications: {
                        ...localSettings.emailNotifications,
                        actionDueEnabled: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                />
                <div className="ml-3 flex-1">
                  <span className="text-sm font-medium text-gray-900">Action Due Reminder</span>
                  <p className="text-xs text-gray-600 mt-1">
                    Notify action owners when SMART actions are due soon
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Email Templates</h2>
            <p className="text-sm text-gray-600 mb-6">
              Customise email templates for different notification types. Available variables will be automatically replaced.
            </p>

            <div className="space-y-6">
              {Object.entries(localSettings.emailNotifications.templates).map(([key, template]) => (
                <div key={key} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">{template.name}</h3>
                  
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Subject Line</label>
                    <input
                      type="text"
                      value={template.subject}
                      onChange={(e) => {
                        const updated = { ...localSettings.emailNotifications };
                        (updated.templates as any)[key].subject = e.target.value;
                        updateLocalSettings({ emailNotifications: updated });
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email Body</label>
                    <textarea
                      value={template.body}
                      onChange={(e) => {
                        const updated = { ...localSettings.emailNotifications };
                        (updated.templates as any)[key].body = e.target.value;
                        updateLocalSettings({ emailNotifications: updated });
                      }}
                      rows={8}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-medium text-gray-700">Available variables:</span>
                    {template.variables.map((variable) => (
                      <code key={variable} className="px-2 py-1 bg-gray-100 text-xs text-gray-800 rounded border border-gray-200">
                        {`{{${variable}}}`}
                      </code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QA Checklist Settings */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">QA Checklist Configuration</h2>
            <p className="text-sm text-gray-600 mb-6">
              Manage the quality assurance criteria used in tripartite reviews. Criteria can be enabled/disabled and reordered.
            </p>

            <div className="space-y-3">
              {localSettings.qaChecklist.criteria
                .sort((a, b) => a.order - b.order)
                .map((criterion, index) => (
                  <div
                    key={criterion.code}
                    className={`border rounded-lg p-4 transition-colors ${
                      criterion.enabled ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-500 w-6">{index + 1}</span>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={criterion.enabled}
                            onChange={(e) => {
                              const updated = { ...localSettings.qaChecklist };
                              const criterionIndex = updated.criteria.findIndex((c) => c.code === criterion.code);
                              updated.criteria[criterionIndex].enabled = e.target.checked;
                              updateLocalSettings({ qaChecklist: updated });
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </label>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm font-semibold mb-1 ${criterion.enabled ? 'text-gray-900' : 'text-gray-500'}`}>
                          {criterion.title}
                        </h3>
                        <p className={`text-xs ${criterion.enabled ? 'text-gray-600' : 'text-gray-400'}`}>
                          {criterion.description}
                        </p>
                        <code className="text-xs text-gray-500 mt-1 inline-block">{criterion.code}</code>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <i className="ri-alert-line text-xl text-amber-600 mt-0.5"></i>
              <div>
                <h3 className="text-sm font-semibold text-amber-900 mb-1">Important Note</h3>
                <p className="text-sm text-amber-800">
                  Disabling criteria will not affect existing reviews, but new reviews will not include disabled criteria. 
                  Compliance scores are calculated based on enabled criteria only.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <i className="ri-alert-line"></i>
                <span>You have unsaved changes</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCancel}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
                >
                  {updateMutation.isPending ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="ri-save-line"></i>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Button */}
      {!hasChanges && (
        <div className="flex justify-end">
          <button
            onClick={handleReset}
            disabled={resetMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
          >
            {resetMutation.isPending ? (
              <>
                <LoadingSpinner size="sm" />
                Resetting...
              </>
            ) : (
              <>
                <i className="ri-restart-line"></i>
                Reset to Defaults
              </>
            )}
          </button>
        </div>
      )}

      {/* Last Updated Info */}
      <div className="text-xs text-gray-500 text-center mt-8">
        Last updated: {new Date(localSettings.updatedAt).toLocaleString('en-GB')} by {localSettings.updatedBy}
      </div>
    </div>
  );
}
