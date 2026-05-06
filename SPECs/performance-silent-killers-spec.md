# Performance Silent Killers

## Problem

The Gemini audit flagged three responsiveness risks for large workspaces:

1. `read_directory_impl` synchronously opened every markdown file to extract a title.
2. The sidebar rendered every flattened file-tree row into the DOM.
3. `read_file` could serialize arbitrarily large files through Tauri IPC.

## Implementation

- Directory listing now returns file metadata without reading markdown contents for title extraction. Open files still infer titles from their loaded content in the editor store.
- The sidebar file tree virtualizes when the flattened tree exceeds 200 rows, rendering the visible range plus overscan based on the existing scroll container.
- `read_file_impl` checks file size before reading and returns `AppError::FileTooLarge` for files above 10 MiB.

## Acceptance Criteria

- Directory listing cost is proportional to directory entries and metadata, not per-file content reads.
- Large expanded file trees avoid mounting thousands of row components at once.
- Huge files are rejected before allocating or JSON-serializing their full content.
- Existing Rust tests pass, including a regression test for the large-file guard.
