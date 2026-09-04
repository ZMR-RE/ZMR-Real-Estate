import type { Task } from './tasksQueries'

interface TaskListProps {
  tasks: Task[]
  processingId: string | null
  onSelect: (id: string) => void
  onComplete: (task: Task) => void
}

export function TaskList({ tasks, processingId, onSelect, onComplete }: TaskListProps) {
  if (tasks.length === 0) {
    return <p>No tasks.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Due</th>
          <th>Title</th>
          <th>Property</th>
          <th>Recurrence</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr key={task.id}>
            <td>{task.due_date}</td>
            <td>
              <button type="button" onClick={() => onSelect(task.id)}>
                {task.title}
              </button>
            </td>
            <td>{task.property?.name ?? '—'}</td>
            <td>{task.recurrence === 'none' ? '—' : task.recurrence}</td>
            <td>{task.completed ? 'Done' : 'Open'}</td>
            <td>
              {!task.completed && (
                <button
                  type="button"
                  disabled={processingId === task.id}
                  onClick={() => onComplete(task)}
                >
                  {processingId === task.id ? 'Marking…' : 'Mark done'}
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
