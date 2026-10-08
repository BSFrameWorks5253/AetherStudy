import React from 'react';
import { SubjectRooms } from './SubjectRooms';

/**
 * SplitWorkspace is replaced by the modernized Subject Rooms Study Desk.
 * Markdown split-editor pane has been completely deprecated in favor of
 * focused, standard-scoped Subject Rooms with Textbook PDFs & Notes.
 */
export const SplitWorkspace: React.FC = () => {
  return <SubjectRooms />;
};

export default SplitWorkspace;
