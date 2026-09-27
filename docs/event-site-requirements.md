# Reusable Event Site: Product Requirements and Architecture

**Status:** Working implementation in `event.html`, `event.css`, `event.js`, and `events/events.js`; final event details remain configurable.

**Scope:** A reusable, static event site centered on `event.html`, hosted from the Booha World GitHub Pages site and distributed privately to participants through QR codes.

## 1. Product decision and purpose

The stable public entry point should be:

```text
https://booha-adventure-studios.github.io/booha-world/event.html?event=halloween-2026
```

`event.html` is the reusable shell. The event ID selects configuration and content, so later events can use the same page without creating another one-off page name. The first configured experience is a daytime Candy Forest hunt; the shell must also support informational-only events and a separate nighttime Booha hunt.

The public site is for event participants and families who do not have access to The Booha Adventure. It must work as a static GitHub Pages site with no login, account, PIN, server session, or preloaded family list.

## 2. Product requirements

### 2.1 Default event information

The default view must make practical information easy to find before any game interaction:

- event name, date, arrival window, start time, end time, and weather/cancellation status;
- address, parking location, parking limits, map links/images, and the approximate three-minute walk from parking to the forest;
- what to bring, appropriate clothing and footwear, costume guidance, insect/weather warnings, and supervision/safety rules;
- toilet availability, stroller/accessibility limitations, and any terrain warnings;
- contact details;
- related schedule items such as a possible Story Time or the next event, both marked TBA until confirmed, plus picnic instructions when configured.

The content should be organized into short, mobile-friendly sections or accordions. A visitor should not need to read the entire page to answer “Where do I park?”, “When should I arrive?”, or “What should my child wear?”.

### 2.2 Candy Forest navigation and pre-start state

Candy Forest is a separate navigation tab or prominent section within the event shell. For October 31, 2026, parking opens at 09:45, families may arrive from 10:00, the hunt opens at 10:00, and new families may begin until the 11:00 cutoff. Student-aged children must wear costumes; parent costumes are optional. Before 10:00 it must:

- show a countdown in Japan/Tokyo time;
- explain the simple loop: **Find → Scan → Reward → Next Target**;
- explain that ten physically hidden Booha Ghosts are in the real forest maze;
- explain that each family/team receives its own randomized order;
- keep the Start control unavailable until 10:00;
- keep the Start control unavailable after the 11:00 cutoff.

There is no fixed hunt end time. Once a family starts, its hunt remains active until all ten ghosts are found or the local hunt record expires. Families may remain in the forest with lunches and snacks until approximately 16:00, subject to the final event rules. A visitor with no active hunt sees a closed-for-new-starts state after 11:00, not an ended-hunt state. A locally completed hunt may continue to show its completion proof until its local record expires.

### 2.3 Starting a public hunt

At the start time, the visitor may enter a family or team name and press Start. The name is a local display label only; it is not an account identity and must not be sent to a server.

On start, the browser generates a randomized permutation of the configured ten ghost colors and stores the active hunt locally. The UI shows only the current target color, never the whole sequence.

### 2.4 QR ghost scans

One QR code per physical ghost/color is sufficient. Each QR code identifies only its color, for example:

```text
https://booha-adventure-studios.github.io/booha-world/event.html?event=halloween-2026&ghost=purple
```

The page must:

- validate the event ID and ghost color against the active event configuration;
- accept a correct scan only when the color is the current target;
- play a satisfying Booha animation and short sound, add the ghost to the collection, update progress, and advance to the next target;
- respond playfully to a wrong color without punishment, loss of progress, or sequence reset, then return to the current target;
- tolerate repeated scans of an already-found color without duplicating progress;
- provide a clear fallback for devices that cannot use camera scanning, such as opening the QR URL directly or entering/pasting a scan URL.

The main interaction should remain physical and social. Do not add quizzes, complicated puzzles, map navigation gameplay, or a large amount of on-screen tapping.

### 2.5 Completion proof

After Ghost 10, show a large, high-contrast completion screen suitable for showing Bryan at the return point. It should include the event title, family/team name, “10/10”, completion time, and a clear completed state. It is visual proof for the event staff, not a cryptographically verifiable receipt; without a backend, it cannot prevent someone from fabricating a completion screen.

### 2.6 Nighttime Booha hunt

The nighttime Zombie Scavenger Hunt is a separate nighttime Booha ghost hunt, not simply a dark version of the QR-based Candy Forest flow. There are 15 numbered ghosts, and teams must find them in numerical order. The challenge is intentionally difficult; last year's teams did not finish. The current design direction is **no QR codes and no team blacklights** for the nighttime hunt. Teams may use multiple phone lights, but every active phone light must have the required purple covering.

The reusable event model should therefore allow a nighttime experience with its own rules and interaction method:

- families/teams relocate to the nighttime or marshmallow area after the daytime forest period;
- teams may use their phone lights, with purple painter's tape or purple translucent film over each light so it is not too bright;
- the camera lens must remain uncovered; if the phone's flash is beside the lens, the team should use a separate taped light or disable the flash when taking proof photos;
- zombies may touch a team when they see a phone light or glowstick;
- physical ghosts have small weatherproof reflective-tape eyes (反射テープ), while their bodies remain dark or plain so they disappear into the forest;
- players sweep slowly and carefully, looking for the eyes to flash directly back at their phone light;
- each ghost is photographed as proof, and the team finds Ghost 1 through Ghost 15 in order;
- seeing a later number does not count until the current number is found; teams should not move or reveal later ghosts to other teams;
- an occasional siren signals that everyone must hide; anyone who is not hiding may receive a clothespin bite clipped to a sleeve or bag;
- a bitten team returns to the Hospital Desk, hands in the clothespin, and receives one glowstick for the team leader as an antidote;
- the glowstick protects the team from the next bite, but must be hidden during the next siren because its light makes the team easier for zombies to spot;
- after finding Ghost 15, the team returns to the Hospital Desk to finish;
- the final team, lighting, safety, infection, clothing, and marshmallow-area copy remains configurable.

The public event information should explain that people joining the nighttime hunt may stay in the forest during the daytime period but must relocate to the marshmallow area when instructed. The nighttime experience should not depend on camera-based QR scanning: the phone is a dim light and photo camera, while the reflective eyes provide the physical discovery mechanic.

## 3. Content requirements from the 2025 references

The two Wix pages should be treated as content and design references, not as a source to copy blindly. Useful daytime Candy Forest content to migrate and rewrite includes:

- 2025 date and 10:00–10:30 arrival window, to be replaced by the 2026 10:00–11:00 arrival window and 09:45 parking opening;
- parking at the Tai Sei Products location, parking limitations, map/photo directions, and the approximately three-minute walk;
- the forest/maze being larger and less even than expected, picnic area guidance, and the 12:00 Story Time schedule;
- the Booha Ghost challenge, family-specific ordered list, photo/proof expectation, and return-to-Bryan candy-bag reward flow;
- costume encouragement, walking shoes/boots, no sandals, insect repellent, weather/cold warnings, guardian supervision, stroller limitations, and no toilet on site;
- contact information and the school/workshop relationship.

Useful nighttime Zombie Scavenger Hunt content includes:

- 2025 18:00 start, arrival deadline, Hospital Desk check-in, and rain cancellation;
- parking/map guidance and the dark, narrow three-minute walk;
- team formation, multiple permitted phone lights, purple painter's tape/film over every active light, keeping camera lenses uncovered for proof photos, and leaving unnecessary bags in cars;
- ordered ghost search and photograph evidence;
- siren/hide rules, clothespin bites, return-to-Hospital-Desk antidote flow, and stay-together/no-running safety rules;
- 15 numbered ghosts, reflective-tape eyes, purple-filtered phone-light discovery, glowstick visibility risk, and any clothing/footwear warnings;
- student participation fee, prizes/marshmallows, guardian supervision, and no toilet.

2025 dates, fees, prizes, map files, and copy are not automatically valid for 2026. The implementation must keep these values in event configuration/content rather than hard-coding them into the shell.

## 4. Recommended architecture

### 4.1 Booha World repository fit

The inspected Booha World repository is a framework-free static site: hand-written HTML, CSS, and JavaScript, with no build step or frontend framework. Existing pages keep substantial page-specific styling and scripts in the HTML files, use the repository's warm dark visual language, and reference assets with relative paths. `event.html` fits this repository well as a self-contained static entry point, provided the event data and hunt logic are kept clearly separated from presentation.

Recommended first structure:

```text
event.html                 reusable document shell
event.css                  event-specific responsive styles
event.js                   shell, countdown, storage, scan routing, and UI state
events/events.js           event registry and event-specific configuration
assets/events/...          event art, maps, ghost assets, and short sounds
docs/event-site-requirements.md
```

The current implementation follows this shape: `event.html` is the reusable shell, `event.css` contains the event presentation, `event.js` contains countdown/hunt behavior, and `events/events.js` contains event-specific configuration and copy.

### 4.2 Configuration model

Use an event registry keyed by stable IDs, with explicit times and feature flags. A conceptual event record should contain:

```text
id, title, status/copy, startsAt, latestStartAt, stayUntil,
arrivalStartAt, arrivalEndAt,
timeZone/displayTimeZone, huntDurationHours,
sections[], scheduleItems[], maps[], contacts[],
experiences: { candyForest: {...}, zombieScavenger: {...} }
```

The Candy Forest experience should contain exactly ten unique color IDs, display labels, colors, optional ghost artwork, scan feedback text, sound references, and reward/completion copy. These are the ten larger colored A4 ghosts that carry the QR codes. The current provisional color set is red, pink, yellow, blue, light blue, green, light green, black, white, and orange; Bryan has not finalized it yet. It also has ten separate smaller gold Booha Ghosts numbered 1–10; these are a distinct physical set and must not be confused with the QR ghosts. The physical cutouts should be smooth construction-paper shapes laminated in clear A4 film and stapled or fastened to trees; the black ghost uses white eyes with black pupils. The nighttime experience uses smaller half-A4/lime-green ghosts numbered 1–15, with round reflective eyes and large black numbers beneath the eyes. It should use its own physical rules configuration: reflective eyes, phone-light guidance, photo proof, clothespin bites, one glowstick antidote per team, and Hospital completion.

Use ISO timestamps with an explicit `+09:00` offset for Japan/Tokyo event configuration. Display with `Intl.DateTimeFormat` using `Asia/Tokyo`; do not rely on the visitor's device timezone for event state or copy. Keep `arrivalStartAt`, `startAt`, `latestStartAt`, and `stayUntil` separate because arrival, hunt opening, last start, and the general forest stay period are different moments. Do not require an `endAt` for the family hunt.

### 4.3 Public site and Adventure version

Use separate entry points with a shared data contract and shared visual/assets conventions, not a shared runtime or iframe.

- **Public version:** canonical participant information and public localStorage hunt at Booha World `event.html`.
- **Adventure version:** an event surface in The Booha Adventure repository, using the same event ID, schedule, ten-color contract, and practical information, but allowed to add Booha-specific presentation or a student reward hook.
- **Shared boundary:** document the event manifest shape and QR URL contract. Copy or synchronize the small event manifest/assets into the Adventure repository when a release is prepared; do not make the authenticated app depend on a cross-origin fetch to the public page at runtime.

This separation protects the existing Adventure systems. The seasonal Adventure link should be controlled by its own event availability configuration, appear near Daily Check and Continue only while an event is active/upcoming, and be renamed from a generic label to the current event name (for example, “Halloween!”). Opening or closing the event surface must not alter curriculum, login, progress, service-worker, or game state. Adventure students can skip the public name form because the authenticated app already knows the current student identity, but the public flow must remain anonymous.

### 4.4 Origin and storage boundary

Booha World is currently hosted at `https://booha-adventure-studios.github.io/booha-world/`. The inspected Adventure deployment redirects through `https://www.bryanharper.tokyo/booha-gate`, so it is a different browser origin. `localStorage` is origin-scoped; paths on the same host would share storage, but these two hosts do not. The two experiences must therefore not assume shared localStorage or cross-device recovery.

If the Adventure app later uses a same-origin route or a backend, that is a separate future decision. The first public hunt should remain self-contained and device-local.

### 4.5 Local storage and expiry

Recommended key format:

```text
booha:event-hunt:v1:<eventId>
```

Recommended record shape:

```text
{
  schemaVersion: 1,
  eventId: "halloween-2026",
  participantLabel: "Harper family",
  order: ["purple", "green", "yellow", "blue", "pink", ...],
  found: ["purple", "green"],
  nextIndex: 2,
  startedAt: 1794096000000,
  updatedAt: 1794096300000,
  expiresAt: 1794139200000,
  completedAt: null
}
```

Recommendations:

- Generate the order once at Start using a client-side shuffle; store it so refreshes do not change the family’s sequence.
- Store the full order locally, but render only the current target and progress count.
- Set `expiresAt` to `startedAt + huntDurationHours` (default approximately 12 hours), with the duration configurable per event.
- On every load, focus, scan, and write, compare the current time with `expiresAt`. Mark an expired record unusable and offer a fresh start only when the event is still accepting starts.
- Keep completed records until expiry so the family can show the completion screen after returning to Bryan.
- Treat localStorage as best-effort. If it is unavailable or full, explain that refresh recovery is unavailable and keep the current in-memory session as long as possible.
- Do not claim recovery on another phone, private-browsing session, or different browser.

## 5. Accessibility, reliability, and privacy requirements

- Mobile-first layout with large touch targets and readable contrast in daylight and at night.
- Keyboard and screen-reader labels for navigation, Start, scan, current target, progress, wrong-scan feedback, and completion proof.
- Respect `prefers-reduced-motion`; sound must be optional and fail harmlessly when blocked or unavailable.
- Request camera permission only after an explicit Scan action. Provide a no-camera fallback.
- Keep all participant data local. Do not add analytics, accounts, advertising, or third-party tracking without a later decision.
- Avoid exposing precise participant data in QR codes; QR codes identify only event ID and ghost color.
- If the repository becomes public, remember that event copy, map images, artwork, and configuration are public source material even when the URL is distributed privately.

## 6. Provided, inferred, and still needed

| Category | What is known now |
|---|---|
| **Provided** | Stable page name is `event.html`; host on Booha World GitHub Pages; public/no-account participant flow; October 31, 2026 event date; parking opens at 09:45; 10:00–11:00 arrival window; hunt opens at 10:00; new starts close at 11:00; no fixed family hunt end; families may stay with lunches/snacks until approximately 16:00; children must wear costumes and parent costumes are optional; next event is TBA; ten larger colored daytime QR ghosts plus ten separate smaller gold ghosts numbered 1–10; randomized per-family color order; one color-only QR per daytime ghost; smooth laminated A4 cutouts fastened to trees; localStorage persistence; approximately twelve-hour expiry; Japan/Tokyo scheduling; separate Candy Forest navigation; nighttime Booha hunt with 15 numbered ghosts, no team blacklights or QR codes, purple-covered phone lights, reflective-tape eyes, photo proof, siren/hide rules, clothespin bites, glowstick antidotes, and Hospital completion; future events; Adventure link near Daily Check and Continue; no student reward chosen yet. |
| **Provided** | Booha World is a static, framework-free HTML/CSS/JavaScript repository. The Adventure app is a separate, much larger static/PWA repository with its own authenticated systems, service worker, and external progress services. |
| **Inferred recommendation** | Keep `event.html` as a reusable shell with event registry/configuration; use explicit `+09:00` timestamps; use separate public and Adventure entry points with a shared manifest/URL contract; keep public hunt state device-local; show current target only; treat completion as visual proof, not anti-cheat verification. |
| **Inferred recommendation** | Preserve the Wix information hierarchy, but rewrite it for 2026 and make parking, arrival, safety, toilets, and contact information visible without hunting through decorative sections. |
| **Still needed from Bryan** | Final event ID/title, confirmation of the 10:00 opening and 11:00 last-start cutoff, the 16:00 stay/relocation instructions, cancellation policy, and whether a family that starts before 11:00 may finish after 16:00. |
| **Still needed from Bryan** | Final decision on the ten colors and physical placement plan; confirm whether the provisional set (red, pink, yellow, blue, light blue, green, light green, black, white, orange) is approved and whether colors need Japanese labels. |
| **Still needed from Bryan** | Final address/parking permission, map assets, parking photos, walking route, capacity, access/stroller guidance, toilet plan, emergency/contact wording, and whether any 2025 map/photo can be reused. |
| **Still needed from Bryan** | Final public copy in English/Japanese, costume and footwear rules, insect/weather wording, whether Story Time will happen, next-event copy, rewards/candy wording, and photo/privacy guidance. |
| **Still needed from Bryan** | Nighttime event date/time, transition/relocation time, team rules, final decision on allowing multiple phone lights, exact purple-tape/film instructions, reflective-eye dimensions/placement, Ghost 1–15 placement, photo-proof rules, clothespin bite/return procedure, glowstick quantity and color, Hospital medicine wording, fee, prize/marshmallow details, safety wording, maps, and final confirmation that the nighttime hunt uses no QR codes or team blacklights. |
| **Still needed from Bryan** | Adventure student reward, whether the Adventure version should share only the hunt or also event information, and the exact Adventure route/link behavior for active/upcoming events. |
| **Still needed technically** | Final decision on camera scanning implementation and fallback, final asset list/audio, browser support target, and whether public deployment should remain at the current GitHub Pages path or move to a custom domain. |

## 7. Bryan's decisions to confirm

1. Approve `event.html` as the stable reusable page name.
2. Approve the public site as the canonical participant information and public hunt experience.
3. Approve separate public and Adventure entry points with a shared contract rather than a shared runtime.
4. Confirm that name entry is a local display label and that no account, PIN, family roster, backend, or cross-device recovery is required for the public hunt.
5. Confirm the ten colors, schedule, 2026 rules, maps, rewards, and final bilingual copy.
6. Choose the Adventure-specific reward and the active-event link wording/placement.
7. Confirm whether a public repository is acceptable for the event configuration and supplied artwork/maps.

## 8. Proposed implementation sequence after approval

1. Freeze the 2026 event manifest, copy, colors, QR URLs, map assets, and legal/permission checks.
2. Add the reusable `event.html` shell and event configuration boundary to Booha World.
3. Build the information view, Tokyo-time status/countdown, and responsive navigation.
4. Build Start/name entry, randomized sequence generation, localStorage persistence, expiry, and resume behavior.
5. Build QR routing/scanning, correct/wrong feedback, progress, completion proof, and no-camera fallback.
6. Add Candy Forest artwork/audio and test with all ten colors and malformed/duplicate/wrong URLs.
7. Test refresh, closed-tab recovery, device lock/resume, expiry, event-before/active/ended states, reduced motion, camera denial, private browsing, and small screens.
8. Add the Adventure event entry point and link visibility only after the public contract is stable; verify it does not change existing Adventure state.
9. Run a live QR rehearsal in the actual forest with the final physical ghost labels, parking route, and staff completion flow.

## References inspected

- [Booha World repository](https://github.com/Booha-Adventure-Studios/booha-world)
- [Booha World GitHub Pages site](https://booha-adventure-studios.github.io/booha-world/)
- [The Booha Adventure repository](https://github.com/Booha-Adventure-Studios/the-booha-adventure)
- [2025 daytime Candy Forest reference](https://bryansenglish.wixsite.com/website)
- [2025 nighttime Zombie Scavenger Hunt reference](https://bryansenglish.wixsite.com/mysite-5)
