import type { Task } from './tasksQueries'

interface UpcomingTasksProps {
  tasks: Task[]
}

export function UpcomingTasks({ tasks }: UpcomingTasksProps) {
  if (tasks.length === 0) {
    return <p>Nothing coming up.</p>
  }

  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.id}>
          {task.due_date} — {task.title} ({task.property?.name ?? '—'})
        </li>
      ))}
    </ul>
  )
}
