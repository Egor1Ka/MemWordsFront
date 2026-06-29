# Staff-first booking on org list view — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On `/[locale]/org/[orgSlug]` make staff and service equal peer filters — the user can start from either side, and the chosen side narrows the other; slot clicks with staff-only selected open a service-picker popover.

**Architecture:** All state lives in URL params (`staff`, `eventType`) as today. `OrgCalendarPage` loads event types for every staff upfront and builds a `Map<staffId, EventType[]>` plus a deduped union for the no-staff case. `StaffTabs` gains an "Все" tab, `ServiceList` gains a staff filter, and a new `SlotServicePopover` wraps free-slot cells when only staff is selected.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind 4, shadcn/ui, `next-intl`, existing `booking-api-client`. No test framework in-repo — verification is `tsc --noEmit`, `eslint`, `next build`, and a manual checklist.

**Spec:** `docs/superpowers/specs/2026-04-14-staff-first-booking-design.md`

---

## File Structure

Created:
- `components/booking/SlotServicePopover.tsx` — shadcn `Popover` with the fitting-services list for a staff-only slot click.

Modified:
- `components/booking/StaffTabs.tsx` — optional `allowAll` prop + leading "Все" tab.
- `components/booking/ServiceList.tsx` — optional `staffId` prop + client-side filter via a staff→services map.
- `components/booking/OrgCalendarPage.tsx` — load event types for every staff at mount, union into an org-level list, allow `selectedStaffId === null`, thread `staffId` into `ServiceList`, guard against inconsistent staff × service state.
- `lib/calendar/view-config.ts` — add `allowStaffOnlySelection: boolean`; set `true` for `ORG_PUBLIC_CONFIG`/`ORG_ADMIN_CONFIG`, `false` for staff-facing configs.
- `lib/calendar/CalendarViewConfigContext.tsx` (or wherever the type lives) — extend `CalendarViewConfig` type.
- `lib/calendar/strategies/createOrgStrategy.tsx` — propagate `allowStaffOnlySelection` into the slot renderer so cells wrap their click handler with `SlotServicePopover` when appropriate.
- `i18n/messages/en.json`, `i18n/messages/uk.json` — new translation keys used below.

Backend: **no changes**. `eventTypeApi.getByStaff` is called once per staff at page load; results are cached in component state.

---

## Conventions

- All new code: `const`, named callbacks, no inline lambdas in `.map` / `.filter`.
- Guard clauses at the caller. No `?.` in guards — object-first, then fields.
- Follow existing tab-indented, single-quote style seen in `OrgCalendarPage.tsx`.
- Every task ends with `npm run lint` + `npx tsc --noEmit` + commit.

---

## Task 1: Add `allowAll` support to `StaffTabs`

**Files:**
- Modify: `components/booking/StaffTabs.tsx`
- Modify: `i18n/messages/en.json`, `i18n/messages/uk.json`

- [ ] **Step 1: Add `allowAllStaff` translation key**

In `i18n/messages/uk.json`, inside the `"booking"` object, add:

```json
"allStaff": "Всі"
```

In `i18n/messages/en.json` add:

```json
"allStaff": "All"
```

- [ ] **Step 2: Extend `StaffTabs` props**

Replace the top of `components/booking/StaffTabs.tsx` props interface and component body:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import type { OrgStaffMember } from '@/services/configs/booking.types'

interface StaffTabsProps {
	staff: OrgStaffMember[]
	selectedId: string | null
	behavior: 'select-one' | 'show-all'
	allowAll?: boolean
	onSelect: (id: string | null) => void
}

const getInitials = (name: string): string =>
	name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)

function StaffTabs({
	staff,
	selectedId,
	behavior,
	allowAll = false,
	onSelect,
}: StaffTabsProps) {
	const t = useTranslations('booking')

	const isSelected = (member: OrgStaffMember): boolean =>
		selectedId === member.id

	const isActive = (member: OrgStaffMember): boolean =>
		behavior === 'show-all' || isSelected(member) || selectedId === null

	const handleClick = (member: OrgStaffMember) => () => {
		if (behavior === 'show-all') return
		const nextId = isSelected(member) ? null : member.id
		onSelect(nextId)
	}

	const handleAllClick = () => onSelect(null)

	const allActive = selectedId === null
	const showAllTab = allowAll && behavior === 'select-one'

	const renderTab = (member: OrgStaffMember) => (
		<button
			key={member.id}
			type="button"
			onClick={handleClick(member)}
			className={cn(
				'flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 transition-opacity',
				isActive(member) ? 'opacity-100' : 'opacity-40',
				behavior === 'select-one' && 'cursor-pointer hover:opacity-80',
				behavior === 'show-all' && 'cursor-default',
			)}
		>
			<Avatar className="size-6">
				<AvatarImage src={member.avatar} alt={member.name} />
				<AvatarFallback className="text-[10px]">
					{getInitials(member.name)}
				</AvatarFallback>
			</Avatar>
			<span className="text-sm font-medium">{member.name}</span>
			<Badge variant="secondary" className="text-[10px]">
				{member.bookingCount}
			</Badge>
		</button>
	)

	return (
		<ScrollArea className="w-full">
			<div className="flex gap-2 pb-2">
				{showAllTab ? (
					<button
						type="button"
						onClick={handleAllClick}
						className={cn(
							'flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 transition-opacity cursor-pointer hover:opacity-80',
							allActive ? 'opacity-100' : 'opacity-40',
						)}
					>
						<span className="text-sm font-medium">{t('allStaff')}</span>
					</button>
				) : null}
				{staff.map(renderTab)}
			</div>
			<ScrollBar orientation="horizontal" />
		</ScrollArea>
	)
}

export { StaffTabs }
```

- [ ] **Step 3: Lint + type-check**

Run: `npm run lint && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add components/booking/StaffTabs.tsx i18n/messages/en.json i18n/messages/uk.json
git commit -m "feat(StaffTabs): add allowAll prop with leading All tab"
```

---

## Task 2: Add `staffId` filter to `ServiceList`

**Files:**
- Modify: `components/booking/ServiceList.tsx`

- [ ] **Step 1: Read current file**

Run: `cat components/booking/ServiceList.tsx`
Expected: keep the visual markup, replace only props + filtering.

- [ ] **Step 2: Add optional staff filter**

Rewrite `components/booking/ServiceList.tsx` preserving existing JSX and only changing logic:

```tsx
'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { EventType } from '@/services/configs/booking.types'

interface ServiceListProps {
	eventTypes: EventType[]
	selectedId: string | null
	staffId?: string | null
	eventTypesByStaff?: Map<string, EventType[]>
	onSelect: (id: string) => void
}

const buildVisibleList = (
	eventTypes: EventType[],
	staffId: string | null | undefined,
	eventTypesByStaff: Map<string, EventType[]> | undefined,
): EventType[] => {
	if (!staffId) return eventTypes
	if (!eventTypesByStaff) return eventTypes
	const forStaff = eventTypesByStaff.get(staffId)
	if (!forStaff) return []
	return forStaff
}

function ServiceList({
	eventTypes,
	selectedId,
	staffId = null,
	eventTypesByStaff,
	onSelect,
}: ServiceListProps) {
	const visible = buildVisibleList(eventTypes, staffId, eventTypesByStaff)

	const renderService = (eventType: EventType) => {
		const handleClick = () => onSelect(eventType.id)
		const isSelected = selectedId === eventType.id
		return (
			<button
				key={eventType.id}
				type="button"
				onClick={handleClick}
				className={cn(
					'flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors',
					isSelected
						? 'border-primary bg-primary/5'
						: 'hover:bg-muted/40',
				)}
			>
				<div
					className="size-2.5 rounded-full"
					style={{ backgroundColor: eventType.color }}
				/>
				<span className="text-sm font-medium">{eventType.name}</span>
				<Badge variant="secondary" className="text-[10px]">
					{eventType.price} {eventType.currency}
				</Badge>
			</button>
		)
	}

	return <div className="flex flex-wrap gap-2">{visible.map(renderService)}</div>
}

export { ServiceList }
```

Note: the exact JSX of the existing `ServiceList` may differ from the snippet above — **keep the existing markup**, only add `staffId`/`eventTypesByStaff` props and the `buildVisibleList` call. Do not re-style buttons if the current styling differs.

- [ ] **Step 3: Lint + type-check**

Run: `npm run lint && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add components/booking/ServiceList.tsx
git commit -m "feat(ServiceList): filter services by selected staffId"
```

---

## Task 3: Extend `CalendarViewConfig` with `allowStaffOnlySelection`

**Files:**
- Modify: `lib/calendar/view-config.ts`

- [ ] **Step 1: Add field to interface and configs**

In `lib/calendar/view-config.ts`, add `allowStaffOnlySelection: boolean` to the interface and each exported config:

```ts
interface CalendarViewConfig {
	blockedTimeVisibility: 'hidden' | 'grey' | 'full'
	columnHeader: 'date' | 'staff'
	showStaffTabs: boolean
	staffTabBehavior: 'select-one' | 'show-all'
	onEmptyCellClick: 'open-booking-flow' | 'none'
	onBlockClick: 'open-booking-details' | 'none'
	canBookForClient: boolean
	allowStaffOnlySelection: boolean
}

const ORG_PUBLIC_CONFIG: CalendarViewConfig = {
	blockedTimeVisibility: 'grey',
	columnHeader: 'staff',
	showStaffTabs: true,
	staffTabBehavior: 'select-one',
	onEmptyCellClick: 'open-booking-flow',
	onBlockClick: 'none',
	canBookForClient: false,
	allowStaffOnlySelection: true,
}

const ORG_ADMIN_CONFIG: CalendarViewConfig = {
	blockedTimeVisibility: 'full',
	columnHeader: 'staff',
	showStaffTabs: true,
	staffTabBehavior: 'select-one',
	onEmptyCellClick: 'open-booking-flow',
	onBlockClick: 'open-booking-details',
	canBookForClient: true,
	allowStaffOnlySelection: true,
}

const STAFF_PUBLIC_CONFIG: CalendarViewConfig = {
	blockedTimeVisibility: 'grey',
	columnHeader: 'date',
	showStaffTabs: false,
	staffTabBehavior: 'select-one',
	onEmptyCellClick: 'open-booking-flow',
	onBlockClick: 'none',
	canBookForClient: false,
	allowStaffOnlySelection: false,
}

const STAFF_SELF_CONFIG: CalendarViewConfig = {
	blockedTimeVisibility: 'full',
	columnHeader: 'date',
	showStaffTabs: false,
	staffTabBehavior: 'select-one',
	onEmptyCellClick: 'open-booking-flow',
	onBlockClick: 'open-booking-details',
	canBookForClient: true,
	allowStaffOnlySelection: false,
}
```

- [ ] **Step 2: Lint + type-check**

Run: `npm run lint && npx tsc --noEmit`
Expected: no new errors. If `CalendarViewConfig` is referenced in a separate `.d.ts` or context file, TypeScript will flag — update that file to export the new field too.

- [ ] **Step 3: Commit**

```bash
git add lib/calendar/view-config.ts
git commit -m "feat(view-config): add allowStaffOnlySelection flag"
```

---

## Task 4: Build `SlotServicePopover`

**Files:**
- Create: `components/booking/SlotServicePopover.tsx`
- Modify: `i18n/messages/en.json`, `i18n/messages/uk.json`

- [ ] **Step 1: Add translation keys**

In `i18n/messages/uk.json` under `"booking"` add:

```json
"pickServiceTitle": "Оберіть послугу:",
"noServicesForSlot": "Немає доступних послуг на цей час"
```

In `i18n/messages/en.json` add:

```json
"pickServiceTitle": "Pick a service:",
"noServicesForSlot": "No services fit this slot"
```

- [ ] **Step 2: Create popover component**

Create `components/booking/SlotServicePopover.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { type ReactNode } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { timeToMin } from '@/lib/slot-engine'
import type { EventType } from '@/services/configs/booking.types'

interface SlotServicePopoverProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	anchor: ReactNode
	slotTime: string
	workEnd: string
	services: EventType[]
	onPick: (eventTypeId: string) => void
}

const minutesBetween = (from: string, to: string): number =>
	timeToMin(to) - timeToMin(from)

const buildFitList = (
	services: EventType[],
	slotTime: string,
	workEnd: string,
): EventType[] => {
	const windowMin = minutesBetween(slotTime, workEnd)
	const fits = (service: EventType): boolean =>
		service.durationMin <= windowMin
	return services.filter(fits)
}

function SlotServicePopover({
	open,
	onOpenChange,
	anchor,
	slotTime,
	workEnd,
	services,
	onPick,
}: SlotServicePopoverProps) {
	const t = useTranslations('booking')
	const visible = buildFitList(services, slotTime, workEnd)

	const renderService = (service: EventType) => {
		const handleClick = () => {
			onPick(service.id)
			onOpenChange(false)
		}
		return (
			<button
				key={service.id}
				type="button"
				onClick={handleClick}
				className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
			>
				<span
					className="size-2.5 rounded-full"
					style={{ backgroundColor: service.color }}
				/>
				<span className="flex-1 font-medium">{service.name}</span>
				<span className="text-muted-foreground text-xs">
					{service.durationMin}м
				</span>
			</button>
		)
	}

	return (
		<Popover open={open} onOpenChange={onOpenChange}>
			<PopoverTrigger asChild>{anchor}</PopoverTrigger>
			<PopoverContent className="w-64 p-2" align="start">
				<div className="text-muted-foreground px-2 pb-1 text-xs font-semibold">
					{t('pickServiceTitle')}
				</div>
				{visible.length === 0 ? (
					<div className="text-muted-foreground px-2 py-1 text-xs">
						{t('noServicesForSlot')}
					</div>
				) : (
					<div className="flex flex-col">{visible.map(renderService)}</div>
				)}
			</PopoverContent>
		</Popover>
	)
}

export { SlotServicePopover }
```

If the project does not yet have a shadcn `popover`, install it:

```bash
npx shadcn@latest add popover
```

- [ ] **Step 3: Lint + type-check**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors. If `timeToMin` is not exported from `@/lib/slot-engine`, grep the codebase for the actual helper and use that one instead (or inline a three-line replacement: `(t) => Number(t.slice(0,2))*60 + Number(t.slice(3,5))`).

- [ ] **Step 4: Commit**

```bash
git add components/booking/SlotServicePopover.tsx i18n/messages/en.json i18n/messages/uk.json components/ui/popover.tsx
git commit -m "feat(booking): add SlotServicePopover for staff-only slot clicks"
```

(If popover.tsx was not added by shadcn in this task, drop it from `git add`.)

---

## Task 5: Load org-wide services in `OrgCalendarPage`

**Files:**
- Modify: `components/booking/OrgCalendarPage.tsx`

- [ ] **Step 1: Extend `OrgData` shape**

Near the top of `components/booking/OrgCalendarPage.tsx`, replace:

```ts
interface OrgData {
	org: OrgBySlugResponse
	staffList: OrgStaffMember[]
	bookings: CalendarDisplayBooking[]
	staffBookings: StaffBooking[]
	eventTypes: EventType[]
	schedule: ScheduleTemplate | null
}
```

with:

```ts
interface OrgData {
	org: OrgBySlugResponse
	staffList: OrgStaffMember[]
	bookings: CalendarDisplayBooking[]
	staffBookings: StaffBooking[]
	eventTypes: EventType[]
	eventTypesByStaff: Map<string, EventType[]>
	schedule: ScheduleTemplate | null
}
```

- [ ] **Step 2: Load event types for every staff and build the map**

Inside `loadOrgData`, replace the block that starts with `let eventTypes: EventType[] = []` and ends before `const bookingArrays` with:

```ts
const fetchStaffEventTypes = async (
	staffId: string,
): Promise<[string, EventType[]]> => {
	const list = await eventTypeApi.getByStaff(staffId)
	return [staffId, list]
}

const perStaffEntries = await Promise.all(
	staffList.map((s) => fetchStaffEventTypes(s.id)),
)
const eventTypesByStaff = new Map<string, EventType[]>(perStaffEntries)

const dedupeById = (acc: Map<string, EventType>, et: EventType) => {
	acc.set(et.id, et)
	return acc
}
const unionMap = perStaffEntries
	.flatMap(([, list]) => list)
	.reduce(dedupeById, new Map<string, EventType>())
const eventTypes = Array.from(unionMap.values())

const activeStaffId = selectedStaffId
const schedule = activeStaffId
	? await scheduleApi.getTemplate(activeStaffId).catch(() => null)
	: null
```

- [ ] **Step 3: Update `setOrgData` call**

Change:

```ts
setOrgData({ org, staffList, bookings: allBookings, staffBookings: allStaffBookings, eventTypes, schedule })
```

to:

```ts
setOrgData({ org, staffList, bookings: allBookings, staffBookings: allStaffBookings, eventTypes, eventTypesByStaff, schedule })
```

- [ ] **Step 4: Remove the implicit `staffList[0]` fallback**

Find the lines:

```ts
const activeStaffId = selectedStaffId ?? (staffList[0]?.id || null)
```

and

```ts
const activeStaffId = selectedStaffId ?? (orgData.staffList[0]?.id || null)
```

Replace the `loadOrgData` occurrence with the simple `selectedStaffId` assignment from Step 2. In `handleConfirmWithClient`, keep the fallback **only** for the confirm path but gate it: if still null, surface an inline error via `setError(t('pickStaffFirst'))` and return. Add translation key `pickStaffFirst` (uk: `"Оберіть сотрудника"`, en: `"Pick a staff member"`).

- [ ] **Step 5: Lint + type-check**

Run: `npm run lint && npx tsc --noEmit`
Expected: no new errors. Fix type complaints from `OrgData` consumers referenced below.

- [ ] **Step 6: Commit**

```bash
git add components/booking/OrgCalendarPage.tsx i18n/messages/en.json i18n/messages/uk.json
git commit -m "feat(OrgCalendarPage): load event types per staff and keep org-wide union"
```

---

## Task 6: Render staff tabs + service list above the list view

**Files:**
- Modify: `components/booking/OrgCalendarPage.tsx` (render path)
- Modify: `lib/calendar/strategies/createOrgStrategy.tsx` (prop threading)

- [ ] **Step 1: Pass the new data through the strategy**

In `components/booking/OrgCalendarPage.tsx`, inside the `createOrgStrategy({ ... })` call, add:

```ts
eventTypesByStaff: orgData.eventTypesByStaff,
selectedStaffId,
allowStaffOnlySelection: viewConfig.allowStaffOnlySelection,
workEnd,
```

- [ ] **Step 2: Pipe `allowAll` into `StaffTabs`**

Change the `staffTabsSlot` block in `OrgCalendarPage.tsx`:

```tsx
const staffTabsSlot = viewConfig.showStaffTabs ? (
	<StaffTabs
		staff={orgData.staffList}
		selectedId={selectedStaffId}
		behavior={viewConfig.staffTabBehavior}
		allowAll={viewConfig.allowStaffOnlySelection}
		onSelect={handleStaffSelect}
	/>
) : null
```

- [ ] **Step 3: Thread `staffId` into `ServiceList` wherever it is rendered**

In `lib/calendar/strategies/createOrgStrategy.tsx` (or wherever `ServiceList` is constructed for the list view) change:

```tsx
<ServiceList
	eventTypes={eventTypes}
	selectedId={selectedEventTypeId}
	onSelect={onSelectEventType}
/>
```

to:

```tsx
<ServiceList
	eventTypes={eventTypes}
	selectedId={selectedEventTypeId}
	staffId={selectedStaffId}
	eventTypesByStaff={eventTypesByStaff}
	onSelect={onSelectEventType}
/>
```

Extend the strategy's props interface to accept `selectedStaffId: string | null`, `eventTypesByStaff: Map<string, EventType[]>`, `allowStaffOnlySelection: boolean`, `workEnd: string`.

- [ ] **Step 4: Lint + type-check + build**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: clean build. Fix any strategy type leaks before moving on.

- [ ] **Step 5: Commit**

```bash
git add components/booking/OrgCalendarPage.tsx lib/calendar/strategies/createOrgStrategy.tsx
git commit -m "feat(org-calendar): filter ServiceList by selected staff, allow all-staff mode"
```

---

## Task 7: Wire `SlotServicePopover` into slot cells

**Files:**
- Modify: `lib/calendar/strategies/createOrgStrategy.tsx`

- [ ] **Step 1: Locate the free-slot cell renderer**

Find where the strategy renders a clickable empty slot (probably the handler returned for `onSelectSlot` or a `SlotCell` component). Log it:

```bash
grep -n "onSelectSlot\|handleSelectSlot" lib/calendar/strategies/createOrgStrategy.tsx lib/calendar/*.tsx
```

- [ ] **Step 2: Add a `staff-only` branch**

For the concrete cell component used in "Список" view, wrap its click in a popover when `allowStaffOnlySelection && selectedStaffId && !selectedEventTypeId`. Example:

```tsx
import { useState } from 'react'
import { SlotServicePopover } from '@/components/booking/SlotServicePopover'

const renderSlotCell = (slotTime: string) => {
	const [open, setOpen] = useState(false)
	const staffOnly =
		allowStaffOnlySelection && selectedStaffId && !selectedEventTypeId
	const services = selectedStaffId
		? eventTypesByStaff.get(selectedStaffId) ?? []
		: []
	const handlePick = (eventTypeId: string) => {
		onSelectEventType(eventTypeId)
		onSelectSlot(slotTime)
	}
	const anchor = (
		<button
			type="button"
			className="h-full w-full"
			onClick={staffOnly ? undefined : () => onSelectSlot(slotTime)}
		>
			{slotTime}
		</button>
	)
	if (!staffOnly) return anchor
	return (
		<SlotServicePopover
			open={open}
			onOpenChange={setOpen}
			anchor={anchor}
			slotTime={slotTime}
			workEnd={workEnd}
			services={services}
			onPick={handlePick}
		/>
	)
}
```

Adapt to the actual cell shape in the codebase. Hooks must live in a React component, so if the current renderer is a bare function, extract a `SlotCell` function component first.

- [ ] **Step 3: Render calendar in empty-but-staff-selected mode**

In the same strategy, when `selectedStaffId && !selectedEventTypeId`, compute slots from `schedule.weeklyHours` + `schedule.slotStepMin` stepping from `workStart` to `workEnd` and subtracting booked intervals, rather than using per-service duration. If the current calendar already renders empty cells in fixed mode, confirm the existing renderer already covers this path; otherwise replicate the stepping logic from `createStaffStrategy`.

- [ ] **Step 4: Handle staff=null + eventType=null**

When both are null, render calendar background only:

```tsx
if (!selectedStaffId && !selectedEventTypeId) {
	return (
		<div className="text-muted-foreground flex h-full items-center justify-center text-sm">
			{t('pickStaffOrService')}
		</div>
	)
}
```

Add translation key `pickStaffOrService` (uk: `"Оберіть послугу чи сотрудника"`, en: `"Pick a service or a staff member"`).

- [ ] **Step 5: Lint + type-check + build**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add lib/calendar/strategies/createOrgStrategy.tsx i18n/messages/en.json i18n/messages/uk.json
git commit -m "feat(org-calendar): popover service picker when only staff is selected"
```

---

## Task 8: Guard inconsistent staff × service state

**Files:**
- Modify: `components/booking/OrgCalendarPage.tsx`

- [ ] **Step 1: Auto-reset `staff` when the selected service is not provided**

After `orgData` is loaded, add an effect that resets `staff` to `null` when the current combination is invalid:

```ts
useEffect(() => {
	if (!orgData) return
	if (!selectedStaffId) return
	if (!selectedEventTypeId) return
	const forStaff = orgData.eventTypesByStaff.get(selectedStaffId) ?? []
	const staffProvides = forStaff.some((et) => et.id === selectedEventTypeId)
	if (staffProvides) return
	setParams({ staff: null, slot: null })
}, [orgData, selectedStaffId, selectedEventTypeId])
```

Keep the same dependency list even though `setParams` is not memoised — it already uses the latest `searchParams` via closure each call.

- [ ] **Step 2: Lint + type-check**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/booking/OrgCalendarPage.tsx
git commit -m "fix(org-calendar): reset staff when selected service is not provided by them"
```

---

## Task 9: Verification pass

**Files:** none (read-only).

- [ ] **Step 1: Typecheck, lint, build**

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all three clean.

- [ ] **Step 2: Manual checklist (dev server)**

Run `npm run dev`, open `http://localhost:3000/uk/org/<orgSlug>`, and walk through:

1. Default load → staff tabs visible with "Всі" + staff; all services visible; calendar respects default view.
2. Click a staff → services narrow to their list; "Всі" unhighlights.
3. Click "Всі" → services widen back; staff cleared.
4. Pick a service without staff → existing behaviour; calendar shows slots across staff.
5. Pick a staff, then click a free slot on the month calendar → popover opens listing services that fit.
6. Pick a service in the popover → right `BookingPanel` moves to `PendingSlot`; `Підтвердити` works.
7. Pick staff, then pick a service that staff does not provide (e.g. via the deep-link `?staff=A&eventType=B`) → page auto-resets `staff` to `null`.
8. Deep link `?staff=A` alone → calendar + filtered services; nothing broken.
9. Deep link `?eventType=X` alone → behaviour unchanged from before the feature.
10. Open `/uk/book/<staffSlug>` (public staff page) → staff tabs still hidden, no popover ever appears, no regression.

- [ ] **Step 3: Record checklist outcome in the final commit body**

If everything passes:

```bash
git commit --allow-empty -m "chore: manual verification for staff-first booking

All 10 scenarios pass on dev server."
```

---

## Self-review notes

- Spec §1 matrix → Tasks 2, 5, 6, 7, 8.
- Spec §2 layout → Tasks 1, 6.
- Spec §3 ServiceList behaviour → Task 2.
- Spec §4 calendar under combinations → Task 7.
- Spec §5 slot popover → Task 4, 7.
- Spec §6 file-level changes → all tasks.
- Spec §7 edge cases:
  - empty services for staff → covered by `buildVisibleList` returning `[]`; visible as "empty `flex gap-2`" (acceptable).
  - service no staff provides → calendar empty path (Task 7 Step 3).
  - auto-reset → Task 8.
- Spec §8 tests → replaced by Task 9 manual checklist (no test framework in repo).
- Spec §9 out-of-scope respected (no backend changes, no public staff page changes, no recurring flows).
