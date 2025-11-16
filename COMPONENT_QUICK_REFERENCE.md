# Component Quick Reference Guide

Quick copy-paste examples for all new design system components.

---

## 🎨 Design Tokens

```typescript
import { tokens } from '@/utils/design-tokens';

// Use in code
const buttonHeight = tokens.components.button.height.md; // 40
const spacing = tokens.spacing.lg; // 24
const shadow = tokens.shadows.md;

// Use in styles
style={{
  padding: `${tokens.spacing.md}px`,
  borderRadius: `${tokens.borderRadius.lg}px`,
  boxShadow: tokens.shadows.lg,
}}

// Use CSS variables
className="text-[var(--color-action-primary)]"
```

---

## 🔘 Buttons

```tsx
import { Button, IconButton, ButtonGroup } from '@/components/buttons';
import { Save, Trash, Download } from 'lucide-react';

// Primary button
<Button variant="primary" size="md">
  Save Changes
</Button>

// With loading state
<Button variant="primary" isLoading={saving}>
  {saving ? 'Saving...' : 'Save'}
</Button>

// With success state
<Button variant="success" isSuccess={saved}>
  {saved ? 'Saved!' : 'Save'}
</Button>

// With icons
<Button variant="danger" startIcon={<Trash />}>
  Delete
</Button>

// Icon only button
<IconButton
  icon={<Download />}
  variant="outline"
  size="md"
  aria-label="Download report"
/>

// Button group
<ButtonGroup spacing="md">
  <Button variant="outline">Cancel</Button>
  <Button variant="primary">Confirm</Button>
</ButtonGroup>

// All variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>
<Button variant="success">Success</Button>
```

---

## 📝 Forms

```tsx
import { FormInput, FormTextarea, FormSelect } from '@/components/forms';
import { User, Mail } from 'lucide-react';

// Text input with validation
<FormInput
  label="Patient Name"
  placeholder="Enter name"
  required
  error={errors.name}
  value={name}
  onChange={(e) => setName(e.target.value)}
/>

// With icons
<FormInput
  label="Email"
  type="email"
  startIcon={<Mail className="w-4 h-4" />}
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

// With success state
<FormInput
  label="Username"
  value={username}
  success="Username is available!"
  onChange={(e) => setUsername(e.target.value)}
/>

// Textarea
<FormTextarea
  label="Notes"
  placeholder="Enter notes"
  rows={4}
  error={errors.notes}
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
/>

// Select
<FormSelect
  label="Agent Type"
  placeholder="Select agent"
  options={[
    { value: 'quick-letter', label: 'Quick Letter' },
    { value: 'tavi', label: 'TAVI Workup' },
    { value: 'rhc', label: 'Right Heart Cath' },
  ]}
  value={agentType}
  onChange={(e) => setAgentType(e.target.value)}
/>

// Variants
<FormInput variant="default" />  {/* White background */}
<FormInput variant="filled" />   {/* Gray background */}
<FormInput variant="outlined" /> {/* Transparent bg, 2px border */}

// Sizes
<FormInput size="sm" /> {/* h-8 */}
<FormInput size="md" /> {/* h-10 (default) */}
<FormInput size="lg" /> {/* h-12 */}
```

---

## ✅ Validation

```tsx
import { ValidationMessage, InlineValidationMessage, FieldValidationWrapper } from '@/components/forms';

// Full validation message
<ValidationMessage
  type="error"
  message="This field is required"
/>

<ValidationMessage
  type="warning"
  message="This value seems unusual"
/>

<ValidationMessage
  type="success"
  message="Validation passed!"
/>

// Inline variant (minimal)
<InlineValidationMessage
  type="error"
  message="Invalid email format"
/>

// Field wrapper (combines input + validation)
<FieldValidationWrapper
  error={errors.field}
  helperText="Enter your email address"
>
  <input type="email" />
</FieldValidationWrapper>
```

---

## 🪟 Modals

```tsx
import { Modal, ConfirmModal, AlertModal } from '@/components/modals';

// Basic modal
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Edit Session"
  size="md"
  footer={
    <>
      <button onClick={onClose}>Cancel</button>
      <button onClick={handleSave}>Save</button>
    </>
  }
>
  <p>Modal content goes here...</p>
</Modal>

// Confirmation dialog
<ConfirmModal
  isOpen={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  onConfirm={handleDelete}
  title="Delete Session"
  message="Are you sure you want to delete this session? This cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  confirmVariant="danger"
  isLoading={deleting}
/>

// Alert dialog
<AlertModal
  isOpen={alertOpen}
  onClose={() => setAlertOpen(false)}
  title="Success!"
  message="Your changes have been saved successfully."
  variant="success" // 'info' | 'success' | 'warning' | 'error'
  buttonText="OK"
/>

// Sizes
<Modal size="sm" />   {/* 400px */}
<Modal size="md" />   {/* 600px (default) */}
<Modal size="lg" />   {/* 800px */}
<Modal size="xl" />   {/* 1000px */}
<Modal size="full" /> {/* 95vw x 95vh */}

// Custom header
<Modal
  isOpen={isOpen}
  onClose={onClose}
  header={
    <div className="flex items-center gap-3">
      <AlertCircle className="w-6 h-6 text-rose-500" />
      <h2 className="text-xl font-semibold">Warning!</h2>
    </div>
  }
>
  <p>Custom header example</p>
</Modal>
```

---

## 📊 Status Badges

```tsx
import { StatusBadge, StatusChip, StateIndicator, ProgressBadge } from '@/components/status';

// Full badge
<StatusBadge
  state="transcribing"
  size="md"
  showIcon
/>

// With action button
<StatusBadge
  state="recording"
  action={{
    label: 'Stop',
    onClick: handleStop
  }}
/>

// Custom label
<StatusBadge
  state="ai-analysis"
  label="Analyzing..."
  size="lg"
/>

// Minimal chip (dot + text)
<StatusChip
  state="completed"
  size="sm"
/>

// Just dot indicator
<StateIndicator
  state="processing"
  size="md"
  withTooltip
/>

// Progress badge
<ProgressBadge
  state="generation"
  progress={75}
  showPercentage
  size="md"
/>

// All states
<StatusBadge state="recording" />        {/* Red */}
<StatusBadge state="transcribing" />     {/* Blue */}
<StatusBadge state="ai-analysis" />      {/* Purple */}
<StatusBadge state="generation" />       {/* Emerald */}
<StatusBadge state="completed" />        {/* Teal */}
<StatusBadge state="error" />            {/* Rose */}
<StatusBadge state="needs_review" />     {/* Amber */}

// Variants
<StatusBadge variant="default" />  {/* Gradient background */}
<StatusBadge variant="dot" />      {/* Gray bg, colored dot */}
<StatusBadge variant="outline" />  {/* Transparent bg, colored border */}
```

---

## 🎯 Dropdowns

```tsx
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownGroup,
  DropdownSeparator,
  DropdownLabel,
  DropdownCheckboxItem
} from '@/components/dropdowns';

// Basic dropdown
<Dropdown value={selected} onValueChange={setSelected}>
  <DropdownTrigger>
    Select Agent
  </DropdownTrigger>
  <DropdownMenu>
    <DropdownItem value="quick-letter">Quick Letter</DropdownItem>
    <DropdownItem value="tavi">TAVI Workup</DropdownItem>
    <DropdownItem value="rhc">Right Heart Cath</DropdownItem>
  </DropdownMenu>
</Dropdown>

// With groups
<Dropdown value={agent} onValueChange={setAgent}>
  <DropdownTrigger>
    {agent || 'Select Agent'}
  </DropdownTrigger>
  <DropdownMenu align="start" maxHeight={400}>
    <DropdownGroup label="Procedural">
      <DropdownItem value="tavi">TAVI Workup</DropdownItem>
      <DropdownItem value="angio-pci">Angiogram/PCI</DropdownItem>
    </DropdownGroup>
    <DropdownSeparator />
    <DropdownGroup label="Documentation">
      <DropdownItem value="quick-letter">Quick Letter</DropdownItem>
      <DropdownItem value="consultation">Consultation</DropdownItem>
    </DropdownGroup>
  </DropdownMenu>
</Dropdown>

// With icons
<DropdownItem
  value="tavi"
  icon={<Heart className="w-4 h-4" />}
>
  TAVI Workup
</DropdownItem>

// Multi-select (checkboxes)
<Dropdown>
  <DropdownTrigger>Select Options</DropdownTrigger>
  <DropdownMenu>
    <DropdownCheckboxItem
      value="option1"
      checked={options.includes('option1')}
      onCheckedChange={(checked) => handleToggle('option1', checked)}
    >
      Option 1
    </DropdownCheckboxItem>
    <DropdownCheckboxItem
      value="option2"
      checked={options.includes('option2')}
      onCheckedChange={(checked) => handleToggle('option2', checked)}
    >
      Option 2
    </DropdownCheckboxItem>
  </DropdownMenu>
</Dropdown>

// Custom trigger
<Dropdown value={value} onValueChange={setValue}>
  <DropdownTrigger asChild>
    <button className="custom-button">
      Custom Trigger
    </button>
  </DropdownTrigger>
  <DropdownMenu>
    <DropdownItem value="1">Item 1</DropdownItem>
  </DropdownMenu>
</Dropdown>
```

---

## ⏳ Skeleton Loading

```tsx
import { Skeleton, SkeletonText, SkeletonCard, SkeletonTable, SkeletonButton } from '@/components/loading';

// Basic skeleton
<Skeleton width={200} height={40} rounded="md" />

// Full width
<Skeleton height={20} rounded="sm" />

// Circle (avatar)
<Skeleton width={48} height={48} rounded="full" />

// Multi-line text
<SkeletonText
  lines={3}
  gap={8}
  lastLineWidth={70}
/>

// Card skeleton
<SkeletonCard
  showHeader
  showFooter
  contentLines={6}
/>

// Table skeleton
<SkeletonTable
  rows={5}
  columns={4}
  showHeader
/>

// Button skeleton
<SkeletonButton size="md" width={100} />

// Disable animation (if needed)
<Skeleton noAnimation />
```

---

## 🚨 Error Handling

```tsx
import { ErrorBoundary } from '@/components/errors';

// Wrap your app (already done in OptimizedApp.tsx)
<ErrorBoundary>
  <App />
</ErrorBoundary>

// Custom error handler
<ErrorBoundary
  onError={(error, errorInfo) => {
    console.error('Caught error:', error, errorInfo);
    // Send to analytics service
  }}
>
  <SomeComponent />
</ErrorBoundary>

// Custom fallback
<ErrorBoundary
  fallback={
    <div className="error-screen">
      <h1>Oops! Something went wrong.</h1>
      <button onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  }
>
  <SomeComponent />
</ErrorBoundary>
```

---

## 🎨 Design Token Usage

```typescript
// In TypeScript/JSX
import { tokens } from '@/utils/design-tokens';

// Colors
const primaryColor = tokens.colors.action.primary;
const dangerColor = tokens.colors.action.danger;

// Spacing
const padding = tokens.spacing.lg; // 24px
const margin = tokens.spacing.md; // 16px

// Shadows
const shadow = tokens.shadows.md;

// Border radius
const radius = tokens.borderRadius.lg; // 16px

// Animations
const duration = tokens.animations.duration.normal; // 300ms
const easing = tokens.animations.easing.easeInOut;

// Z-index
const modalZIndex = tokens.zIndex.modal; // 999998
const dropdownZIndex = tokens.zIndex.dropdown; // 999999

// Component tokens
const buttonHeight = tokens.components.button.height.md; // 40
const modalWidth = tokens.components.modal.width.lg; // 800

// In CSS/Tailwind
className="shadow-[var(--shadow-md)]"
style={{ zIndex: 'var(--z-modal)' }}
```

---

## 📦 Import Patterns

```typescript
// Individual components
import { Button } from '@/components/buttons';
import { FormInput } from '@/components/forms';
import { Modal } from '@/components/modals';

// Multiple from same package
import { StatusBadge, StatusChip, StateIndicator } from '@/components/status';

// With types
import { Button, type ButtonVariant, type ButtonSize } from '@/components/buttons';

// All from one package
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownGroup,
} from '@/components/dropdowns';
```

---

## 🎯 Common Patterns

### Loading → Content Pattern
```tsx
{isLoading ? (
  <SkeletonCard showHeader contentLines={6} />
) : (
  <div className="card">
    <h2>{title}</h2>
    <p>{content}</p>
  </div>
)}
```

### Form with Validation
```tsx
<form onSubmit={handleSubmit}>
  <FormInput
    label="Name"
    required
    error={errors.name}
    value={formData.name}
    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
  />

  <ButtonGroup spacing="md">
    <Button variant="outline" type="button" onClick={onCancel}>
      Cancel
    </Button>
    <Button variant="primary" type="submit" isLoading={submitting}>
      {submitting ? 'Saving...' : 'Save'}
    </Button>
  </ButtonGroup>
</form>
```

### Delete Confirmation
```tsx
const [confirmDelete, setConfirmDelete] = useState(false);

<Button variant="danger" onClick={() => setConfirmDelete(true)}>
  Delete
</Button>

<ConfirmModal
  isOpen={confirmDelete}
  onClose={() => setConfirmDelete(false)}
  onConfirm={async () => {
    await handleDelete();
    setConfirmDelete(false);
  }}
  title="Delete Session"
  message="Are you sure you want to delete this session? This action cannot be undone."
  confirmVariant="danger"
  confirmText="Delete"
/>
```

### Status Display
```tsx
// In session timeline
<StatusBadge
  state={session.status as ProcessingState}
  size="sm"
  variant="dot"
/>

// In active header
<StatusBadge
  state="recording"
  size="md"
  action={{
    label: 'Stop',
    onClick: stopRecording
  }}
/>
```

---

## 🔍 TypeScript Types

```typescript
// Import types
import type {
  ButtonVariant,
  ButtonSize
} from '@/components/buttons';

import type {
  InputVariant,
  InputSize,
  InputState
} from '@/components/forms';

import type {
  ModalSize
} from '@/components/modals';

import type {
  BadgeSize,
  BadgeVariant
} from '@/components/status';

import type {
  ValidationMessageType
} from '@/components/forms';

// Use in props
interface MyComponentProps {
  size: ButtonSize;
  variant: ButtonVariant;
  modalSize: ModalSize;
}
```

---

## 💡 Pro Tips

1. **Always use design tokens** instead of magic numbers
2. **Prefer composable components** (Dropdown system) over monolithic ones
3. **Use Skeleton components** for all loading states to eliminate "stuck at 0%" perception
4. **ErrorBoundary is already global** - no need to add more unless you want component-specific error handling
5. **StatusBadge integrates with stateColors.ts** - use `ProcessingState` types
6. **Modal automatically manages scroll locking** - no need to handle manually
7. **Dropdown auto-positions** - no need to calculate positions manually
8. **FormInput validation is integrated** - pass error/warning/success props
9. **Button loading states** - use `isLoading` instead of manual spinner management
10. **Import from index files** - cleaner imports, better tree-shaking

---

*Quick Reference Guide - Generated with Claude Code*
