# Workspace Path Confinement

## Problem

Writer's frontend passes absolute paths into Tauri IPC commands. If the renderer is compromised, filesystem commands could read, write, rename, delete, reveal, or test arbitrary host paths rather than paths inside the currently open workspace.

## Goal

All file-oriented IPC commands must enforce that resolved paths stay inside the current workspace root before touching the filesystem.

## Scope

Commands covered:

- `read_directory`
- `read_file`
- `write_file`
- `create_file`
- `create_directory`
- `rename_entry`
- `delete_entry`
- `file_exists`
- `reveal_in_file_manager`
- restore/startup internal active-file reads

## Design

Add a central Rust path validation helper that:

1. Reads the current window's `WorkspaceState.workspace_root`.
2. Canonicalizes the workspace root.
3. For existing paths, canonicalizes the path and requires it to start with the root.
4. For paths that may not exist yet, canonicalizes the parent directory, joins the requested file name, and requires the resolved parent to start with the root.
5. Rejects paths without a normal file name when a creatable target is expected.
6. Treats symlinks securely: the canonicalized target must resolve inside the workspace.

Expose denials through `AppError::Forbidden`.

## Acceptance Criteria

- Existing valid workspace operations keep working.
- `../` traversal and absolute paths outside the workspace are rejected before filesystem access.
- Symlinks that point outside the workspace are rejected.
- Renames cannot move files out of the workspace.
- Creates cannot write into parents outside the workspace.
- Rust tests cover the guard behavior.
