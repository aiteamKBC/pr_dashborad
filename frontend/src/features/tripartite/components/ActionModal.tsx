import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '../../../shared/components/Button';

interface ActionModalProps {
  action?: any;
  onSave: (action: any) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export default function ActionModal({ action, onSave, onDelete, onClose }: ActionModalProps) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: action || {
      ownerType: 'LEARNER',
      actionText: '',
      linkedKsb: '',
      linkedNextStep: '',
      dueDate: '',
      status: 'OPEN',
    },
  });

  const onSubmit = (data: any) => {
    onSave({
      ...data,
      linkedKsb: data.linkedKsb || null,
      linkedNextStep: data.linkedNextStep || null,
      dueDate: data.dueDate || null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {action ? 'Edit Action' : 'Create Action'}
          </h2>
          <button onClick={onClose} className="cursor-pointer">
            <i className="ri-close-line text-2xl text-gray-400 hover:text-gray-600"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner Type *</label>
              <select
                {...register('ownerType', { required: 'Owner type is required' })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              >
                <option value="LEARNER">Learner</option>
                <option value="EMPLOYER">Employer</option>
                <option value="COACH">Coach</option>
              </select>
              {errors.ownerType && <p className="text-xs text-red-600 mt-1">{errors.ownerType.message as string}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action Text *</label>
              <textarea
                {...register('actionText', { required: 'Action text is required', minLength: { value: 10, message: 'Action text must be at least 10 characters' } })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
                placeholder="Describe the action to be taken..."
              />
              {errors.actionText && <p className="text-xs text-red-600 mt-1">{errors.actionText.message as string}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked KSB</label>
                <input
                  {...register('linkedKsb')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., K1, S5, B3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Next Step</label>
                <input
                  {...register('linkedNextStep')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Gateway preparation"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  {...register('dueDate')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                <select
                  {...register('status', { required: 'Status is required' })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DONE">Done</option>
                </select>
                {errors.status && <p className="text-xs text-red-600 mt-1">{errors.status.message as string}</p>}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
            <div>
              {onDelete && (
                <Button type="button" variant="danger" onClick={onDelete}>
                  Delete Action
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {action ? 'Update Action' : 'Create Action'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}