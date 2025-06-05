import React from "react";

interface Props {
  task: any;
  onClose: () => void;
  canEdit: boolean;
}

const MaintenanceTaskDetails: React.FC<Props> = ({ task, onClose, canEdit }) => {
  if (!task) return null;
  return (
    <div>
      <div>Maintenance Task Details (placeholder)</div>
      <pre>{JSON.stringify(task, null, 2)}</pre>
      <button onClick={onClose}>Close</button>
      {canEdit && <button>Edit</button>}
    </div>
  );
};

export default MaintenanceTaskDetails;
