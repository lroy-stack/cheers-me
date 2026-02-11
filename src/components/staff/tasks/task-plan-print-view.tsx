'use client'

import { forwardRef } from 'react'
import type { PlannedTask, WeeklyTaskPlan } from '@/types'

interface TaskPlanPrintViewProps {
  plan: WeeklyTaskPlan | null
  tasksByDay: Record<number, PlannedTask[]>
  weekStartStr: string
  dayLabels: string[]
  weekDates: string[]
}

export const TaskPlanPrintView = forwardRef<HTMLDivElement, TaskPlanPrintViewProps>(
  function TaskPlanPrintView({ plan, tasksByDay, weekStartStr, dayLabels, weekDates }, ref) {
    return (
      <div ref={ref} className="print-only hidden print:block p-8 text-black bg-white">
        <h1 className="text-xl font-bold mb-1">Weekly Task Plan</h1>
        <p className="text-sm text-gray-600 mb-4">
          Week of {weekStartStr} — Status: {plan?.status || 'draft'}
        </p>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {dayLabels.map((label, i) => (
                <th
                  key={i}
                  className="border border-gray-300 bg-gray-100 px-2 py-1.5 text-left font-semibold"
                  style={{ width: `${100 / 7}%` }}
                >
                  <div>{label}</div>
                  <div className="font-normal text-gray-500">{weekDates[i]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {Array.from({ length: 7 }, (_, day) => (
                <td key={day} className="border border-gray-300 px-1.5 py-1 align-top">
                  <div className="space-y-1">
                    {(tasksByDay[day] || []).map(task => (
                      <div
                        key={task.id}
                        className="border-l-2 pl-1 py-0.5"
                        style={{
                          borderLeftColor:
                            task.priority === 'urgent' ? '#ef4444' :
                            task.priority === 'high' ? '#f97316' :
                            task.priority === 'medium' ? '#3b82f6' : '#22c55e',
                        }}
                      >
                        <div className="font-medium">{task.title}</div>
                        {task.assigned_employee?.profile?.full_name && (
                          <div className="text-gray-500">{task.assigned_employee.profile.full_name}</div>
                        )}
                        {task.estimated_minutes && (
                          <div className="text-gray-400">{task.estimated_minutes}m</div>
                        )}
                      </div>
                    ))}
                    {(!tasksByDay[day] || tasksByDay[day].length === 0) && (
                      <div className="text-gray-300 italic">—</div>
                    )}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        <div className="mt-4 flex gap-4 text-xs text-gray-500">
          <span>Total tasks: {Object.values(tasksByDay).flat().length}</span>
          <span>
            Est. time: {Object.values(tasksByDay).flat().reduce((s, t) => s + (t.estimated_minutes || 0), 0)}min
          </span>
        </div>
      </div>
    )
  }
)
