import React from "react";

interface Props {
  tasks: any[];
  selectedTaskId?: string;
  onSelectTask: (task: any) => void;
}

const MaintenanceTaskList: React.FC<Props> = ({ tasks, selectedTaskId, onSelectTask }) => {
  return (
    <div>
      <div>Maintenance Task List (placeholder)</div>
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            <button onClick={() => onSelectTask(task)} style={{ fontWeight: selectedTaskId === task.id ? 'bold' : 'normal' }}>
              {task.title || task.id}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MaintenanceTaskList;
