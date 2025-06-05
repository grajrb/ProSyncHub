import React from "react";

interface Props {
  tasks: any[];
  selectedDate?: Date;
  onSelectTask: (task: any) => void;
}

const ScheduleCalendarView: React.FC<Props> = ({ tasks, selectedDate, onSelectTask }) => {
  return (
    <div>
      <div>Schedule Calendar View (placeholder)</div>
      <ul>
        {tasks
          .filter(task => selectedDate ? new Date(task.date).toDateString() === selectedDate.toDateString() : true)
          .map(task => (
            <li key={task.id}>
              <button onClick={() => onSelectTask(task)}>{task.title || task.id}</button>
            </li>
          ))}
      </ul>
    </div>
  );
};

export default ScheduleCalendarView;
