import React from 'react';
import { SubjectRooms } from './SubjectRooms';

/**
 * SplitWorkspace is replaced by the modernized Subject Rooms Study Desk.
 * Markdown split-editor pane has been completely deprecated in favor of
 * focused, standard-scoped Subject Rooms with Textbook PDFs & Notes.
 */
export interface SplitWorkspaceProps {
  initialSubject?: string | null;
  onClearSubject?: () => void;
}

export const SplitWorkspace: React.FC<SplitWorkspaceProps> = ({ initialSubject, onClearSubject }) => {
  return <SubjectRooms initialSubject={initialSubject} onClearSubject={onClearSubject} />;
};

export default SplitWorkspace;
