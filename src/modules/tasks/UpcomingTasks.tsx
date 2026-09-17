import { propertyLabel } from '../../shared/propertyLabel'
import type { Task } from './tasksQueries'

interface UpcomingTasksProps {
  tasks: Task[]
}

export function UpcomingTasks({ tasks }: UpcomingTasksProps) {
  if (tasks.length === 0) {
    return <p className="empty-state">Nothing coming up.</p>
  }

  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.id}>
          {task.due_date} — {task.title} ({propertyLabel(task.property)})
        </li>
      ))}
    </ul>
  )
}
