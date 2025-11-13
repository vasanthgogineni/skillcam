# SkillCam Design Guidelines

## Design Approach

**Selected Approach:** Utility-First Design System
Drawing inspiration from modern productivity platforms like Linear (clean dashboards, crisp data presentation), Asana (task management clarity), and Notion (intuitive forms and content organization). This approach prioritizes functionality, data clarity, and efficient workflows over decorative elements.

**Core Principles:**
1. **Clarity Over Decoration** - Every element serves a functional purpose
2. **Consistent Hierarchy** - Clear visual distinction between primary, secondary, and tertiary actions
3. **Efficient Workflows** - Minimize clicks and cognitive load for both trainees and trainers
4. **Data Transparency** - Make metrics, scores, and feedback immediately scannable

---

## Typography

**Font Stack:**
- Primary: Inter (via Google Fonts) - for UI elements, body text, data tables
- Secondary: Space Grotesk (via Google Fonts) - for headings and emphasis

**Type Scale:**
- Hero/Page Titles: 3xl font-bold (Space Grotesk)
- Section Headings: xl font-semibold (Space Grotesk)
- Subsections: lg font-medium (Inter)
- Body Text: base font-normal (Inter)
- Captions/Metadata: sm font-normal (Inter)
- Data Labels: xs font-medium uppercase tracking-wide (Inter)

---

## Layout System

**Spacing Primitives:**
Core spacing units: 2, 4, 6, 8, 12, 16 (Tailwind scale)
- Tight spacing (form fields, card content): p-4, gap-2
- Standard spacing (sections, cards): p-6, p-8
- Generous spacing (page sections): py-12, py-16
- Page containers: max-w-7xl mx-auto px-6

**Grid Structure:**
- Dashboard layouts: 12-column grid with gap-6
- Trainer review interface: 2-column split (video player 60%, details 40%)
- Feedback cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 with gap-6
- Forms: Single column max-w-2xl for optimal scanability

---

## Component Library

### Navigation
**Top Navigation Bar:**
- Fixed header with subtle bottom border
- Logo left-aligned with product name "SkillCam"
- Primary navigation center (Dashboard, Upload, Reviews for respective roles)
- User profile dropdown right-aligned showing role badge (Trainee/Trainer)
- Height: h-16 with px-6 horizontal padding

**Role Switcher (if applicable):**
- Pill-style toggle for users with multiple roles
- Located in top navigation next to profile

### Upload Portal Components
**Video Upload Zone:**
- Large drop zone (min-h-64) with dashed border
- Centered icon (upload cloud icon from Heroicons) and instructional text
- File format and size limit clearly displayed (250MB max)
- Progress bar appears below drop zone during upload with percentage indicator

**Metadata Form:**
- Vertical form layout with clear field labels
- Task Name: text input with placeholder
- Tool Type: dropdown select with common tools pre-populated
- Difficulty Level: segmented control (Beginner, Intermediate, Advanced)
- Additional Notes: textarea (optional context)
- Submit button: primary action, full-width on mobile, auto-width on desktop

### Trainer Review Interface
**Video List Sidebar (left 30% of screen):**
- Scrollable list of video submissions
- Each item shows: trainee name, task name, upload date, AI score badge
- Flag icon for low-scoring videos (< 60%)
- Search input at top with filter dropdowns (by score range, task type, date)
- Selected video highlighted with accent background

**Video Player Section (right 70%):**
- Large video player with standard controls
- Playback timeline with ability to add timestamp markers
- AI-generated scorecard displayed below player in card format
- Metrics presented as: Accuracy: 85/100, Stability: 78/100, Completion Time: 4:23
- Trainer comment interface: textarea for general notes + ability to add timestamped comments
- Action buttons: Approve, Request Revision, Flag for Discussion

### Feedback Dashboard
**Header Section:**
- Welcome message with trainee name
- Quick stats row: Total Uploads, Average Score, Improvement Trend (with small trend arrow)

**Performance Overview Card:**
- Line chart showing score progression over time (last 10 uploads)
- Chart library recommendation: Chart.js or Recharts
- Y-axis: Score (0-100), X-axis: Upload date
- Toggle between different metrics (Accuracy, Stability, Time)

**Recent Submissions Grid:**
- Card-based layout showing last 5 uploads
- Each card includes: Task thumbnail/icon, task name, date, AI score badge, trainer review status
- Status indicators: "AI Evaluated", "Trainer Reviewed", "Awaiting Review"
- Click card to view detailed feedback

**Detailed Feedback View:**
- Full-width layout when viewing specific submission
- Video player (if user wants to review their own video)
- Side-by-side comparison: AI Metrics (left column) | Trainer Feedback (right column)
- AI metrics displayed as labeled progress bars with numerical values
- Trainer comments shown with timestamps if applicable
- Download PDF button (prominent secondary action)

### Data Display Components
**Score Badge:**
- Circular or pill-shaped badge
- Size variations: sm, md, lg
- Score displayed as "85/100" format
- Visual indicator: 80+ (excellent), 60-79 (good), below 60 (needs improvement)

**Metric Cards:**
- Compact card showing single metric
- Large number/percentage at top
- Metric label below
- Optional trend indicator (up/down arrow with percentage change)

**Status Pills:**
- Small rounded pill for submission status
- Text: "Pending AI Review", "AI Evaluated", "Trainer Reviewed", "Approved"
- Distinct visual treatments for each state

### Forms & Inputs
**Text Inputs:**
- Clean single-line border (border-b-2 style)
- Label positioned above input
- Focus state: accent underline animation
- Error state: red underline with error message below

**Dropdowns/Selects:**
- Consistent height with text inputs
- Chevron icon indicating dropdown
- Options list with hover states

**Buttons:**
**Primary:** Solid background, medium font-weight, px-6 py-3, rounded-lg
**Secondary:** Outlined border, same padding and rounding
**Tertiary:** Text-only with subtle hover background
**Danger:** Used for delete/critical actions

### Video Player
- Use HTML5 video player with custom controls
- Minimal chrome design matching overall aesthetic
- Timestamp display, play/pause, volume, fullscreen controls
- Scrubber timeline with hover preview (if feasible)
- Playback speed control for trainer review

### Charts & Data Visualization
**Performance Charts:**
- Clean line charts for progress over time
- Bar charts for comparing metrics across submissions
- Minimal gridlines, clear axis labels
- Tooltip on hover showing exact values
- Consistent visual treatment across all charts

### PDF Report Template
**Structure:**
- Header: SkillCam logo, trainee name, report date
- Task Information: Name, tool, difficulty, upload date
- AI Evaluation Summary: Table format with metric names and scores
- Trainer Feedback: Text block with comments
- Visual Elements: Small score visualization (progress bars or radial charts)
- Footer: Generated timestamp, SkillCam branding

---

## Page Layouts

**Authentication Pages (Login/Register):**
- Centered card layout (max-w-md)
- Logo and tagline at top
- Form fields with clear spacing (gap-4)
- Role selection (radio buttons or segmented control) during registration
- Social proof element: "Trusted by 500+ training programs" below form

**Trainee Dashboard:**
- Grid layout: Performance overview (top), Recent uploads grid (middle), Quick upload CTA (bottom)
- Prominent "Upload New Video" button in top-right
- Sidebar navigation on larger screens

**Trainer Dashboard:**
- Split layout: Video queue (left sidebar 320px), Main review area (flexible)
- Filters and search prominent at top of queue
- Notification badge for new submissions requiring review

**Upload Page:**
- Two-step process: 1) Video upload, 2) Metadata form
- Progress indicator showing current step
- Upload zone takes center focus
- Form appears after successful upload
- Clear success state with "View Feedback" CTA

**Feedback Detail Page:**
- Breadcrumb navigation at top
- Video player in hero position (if trainee wants to review)
- Two-column feedback layout below
- Download PDF button in top-right of page

---

## Images

**Hero Sections:**
No traditional hero images needed - this is a utility-focused application

**Placeholder Images:**
- Video thumbnails: Use placeholder with camera icon when video thumbnail unavailable
- Empty states: Illustration-style graphics for "No uploads yet", "No feedback available"
- Trainer profile: Avatar placeholder with initials if no photo uploaded

**Icons:**
Use Heroicons (outline style) throughout for consistency:
- Upload: cloud-arrow-up
- Review: clipboard-document-check
- Feedback: chat-bubble-left-right
- Video: video-camera
- Charts: chart-bar
- Download: arrow-down-tray
- Flag: flag
- Success: check-circle
- Warning: exclamation-triangle

---

## Special Considerations

**Empty States:**
- Friendly, encouraging messaging for first-time users
- Clear CTAs to take first action (e.g., "Upload Your First Video")
- Small illustration or icon to make empty state feel intentional

**Loading States:**
- Skeleton screens for video lists and dashboards
- Spinner with progress percentage for AI evaluation
- "Processing your video..." messaging during AI analysis

**Responsive Behavior:**
- Mobile: Single column, stack sidebar content, prioritize upload button
- Tablet: Maintain two-column layouts where appropriate
- Desktop: Full multi-column dashboard layouts

**Accessibility:**
- High contrast ratios for all text
- Focus indicators on all interactive elements
- ARIA labels for video controls and data visualizations
- Keyboard navigation support for video player and forms