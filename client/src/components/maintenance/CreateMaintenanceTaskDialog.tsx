import React from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const CreateMaintenanceTaskDialog: React.FC<Props> = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div>
      <div>Create Maintenance Task Dialog (placeholder)</div>
      <button onClick={onClose}>Close</button>
    </div>
  );
};

export default CreateMaintenanceTaskDialog;
