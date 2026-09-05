# CTR-CMS User Guide

Belgharia Club Town Cultural Association

## Application URLs

- Admin portal: https://ctr-cms-admin.onrender.com
- API: https://ctr-cms-api.onrender.com
- Mobile app: install the current Android APK supplied by the committee

The system uses email and password login. The mobile app and admin portal use the same account credentials.

## Roles and permissions

| Role | Mobile access | Admin portal | User management | Nomination limit |
| --- | --- | --- | --- | --- |
| Resident (`USER`) | Yes | No | No | Maximum 2 per program |
| Admin (`ADMIN`) | Yes | Yes | No | Unlimited |
| Super Admin (`SUPER_ADMIN`) | Yes | Yes | Yes | Unlimited |

The nomination limit is per account and per program. One nomination is valid; a second is optional. A resident is blocked from a third nomination for the same program.

## Resident mobile workflow

### 1. Sign in

1. Open the mobile app.
2. Enter the registered email address and password.
3. Select **Login**.
4. Use **Forgot password / OTP reset** if the password needs to be reset.
5. OTP verification codes are sent to the email address, not the mobile number.

### 2. Register a resident account

Enter all required fields:

- Full name
- Indian mobile number in `+91XXXXXXXXXX` format
- Flat and block in the format `1A/B1` through `6L/B6`
- Email address
- Password

The email address is used for login and email verification. The phone number is captured for resident contact information.

### 3. Home screen

The home screen provides:

- Published events
- Live programs
- Today's program schedule
- Upcoming programs
- Programs currently open for registration
- My nominations
- Messages and reminders
- Admin-managed festival gallery

Content refreshes automatically approximately every 30 seconds, when the app returns to the foreground, and through pull-to-refresh.

### 4. Submit a nomination

1. Open a program shown as open for registration.
2. Select **Nominate**.
3. Complete all required fields:
   - Participant name
   - Mobile number
   - Flat/block number
   - Age
   - Solo or group performance
   - Performance type
   - Probable performance time
   - Brief performance summary
4. Optionally take a photo with the camera or choose one from the gallery.
5. Select **Submit nomination**.

Validation rules:

- Mobile number must be an Indian number in `+91XXXXXXXXXX` format.
- Flat must match the supported block and flat format.
- Solo performances may be up to 10 minutes.
- Group performances may be up to 20 minutes.
- Photo is optional and must be an image within the upload limit.
- The selected event/program must be published and within its nomination window.

The mobile number and flat number are prefilled from the account but can be edited before submission. The submitted values are stored with that nomination.

### 5. Check nominations and messages

- **My nominations** shows submitted nominations and allocated slots.
- **Messages** shows event announcements and reminders sent by administrators.
- Tap an unread message to mark it as read.

## Admin portal workflow

Admins sign in at https://ctr-cms-admin.onrender.com. Admins can manage events, programs, nominations, notifications, gallery content, and schedules. They cannot change user roles or account statuses.

### 1. Create an event

1. Open **Events**.
2. Select **Create event**.
3. Enter the event title, venue, dates, description, and status.
4. Publish the event when it is ready for residents.

Only published events can be targeted by the notification workflow.

### 2. Create a program

1. Open the event and select **Add program**, or use **Programs**.
2. Enter the program name, description, rules, participant limit, category, and nomination dates.
3. Choose `COMPETITION` or `PERFORMANCE`.
4. Save the program.

The nomination closing time must be before the event starts. If this rule is violated, the portal displays a validation message instead of exposing the database error.

### 3. Manage nominations

1. Open **Nominations** to review submissions and statuses.
2. Approve, reject, or otherwise update a nomination as appropriate.
3. Use **Allocate time + venue** to create or update a schedule slot.
4. Use **Participants** to select an event and program and view the participant order list.

Participant exports include:

- Index number
- Participant name
- Age
- Block and flat
- Contact number
- Performance mode and type
- Probable time
- Summary
- Photo

Competition programs also include judge score, Judge 1, Judge 2, and Judge 3 columns.

The participant view supports CSV export and browser print-to-PDF. Use landscape print orientation for the widest tables.

### 4. Send notifications and schedule reminders

1. Open **Notifications**.
2. Select a published event.
3. Select a published program belonging to that event.
4. Enter a title and message.
5. Select the notification type.
6. Choose **Send now** or select a send time and choose **Schedule reminder**.
7. Select a frequency:
   - Ad hoc: once
   - Daily
   - Weekly

Only published events and programs can be targeted. Scheduled reminders are processed automatically by the API approximately once per minute.

Notifications currently appear in the mobile app's in-app Messages section. They are not native Android push notifications.

### 5. Manage the gallery

1. Open **Gallery**.
2. Choose an image file.
3. Optionally enter a title and caption.
4. Select **Upload image**.
5. Use **Remove** to permanently delete an image.

Gallery storage policy:

- Maximum 50 active images
- Maximum 4 MB per image
- When the limit is exceeded, the oldest active images are permanently deleted
- Removed images are permanently deleted and stop appearing in the mobile app

Mobile users see uploaded images after the normal automatic refresh, app resume, or pull-to-refresh. Tapping a thumbnail opens a full-screen viewer with previous/next navigation.

## Super Admin workflow

Super Admins have all Admin permissions plus account management.

### Manage user roles

1. Open **Users**.
2. Find the user.
3. Change the role to `USER`, `ADMIN`, or `SUPER_ADMIN`.
4. Save the change.

### Manage account status

Super Admins can set an account to:

- `ACTIVE`: normal access
- `INACTIVE`: disabled access
- `BLOCKED`: blocked access

Role and status changes are protected on the server and cannot be performed by a normal Admin.

### Security responsibilities

- Use a unique production password for the Super Admin account.
- Do not share administrator credentials.
- Do not put API, database, or OAuth secrets in the mobile app.
- Review active users and inactive accounts regularly.

## Default seeded Super Admin

Fresh seeded environments include a default Super Admin account for initial setup. Change its password immediately in a production environment. The credentials should not be distributed in public documentation or shared outside the committee.

## Deployment checklist

After merging a release:

1. Deploy the API and confirm the health endpoint reports database connectivity.
2. Confirm migrations run successfully, including:
   - `008_notifications_gallery_schedule.sql`
   - `009_nomination_contact_details.sql`
3. Deploy the admin portal.
4. Build and distribute a new Android APK when mobile code changes.
5. Test:
   - Resident login and registration
   - Nomination submission and the two-submission resident limit
   - Admin unlimited nomination behavior
   - Program date validation
   - Notification send and scheduled reminder processing
   - Gallery upload, mobile refresh, full-screen view, and deletion
   - Participant CSV/PDF export

## Troubleshooting

- **Program creation rejected:** ensure nomination closing is before the event start.
- **Nomination unavailable:** confirm the program is published and the current time is inside the nomination window.
- **Third resident nomination rejected:** the resident has reached the two-nomination limit for that program.
- **Admin cannot change roles:** only Super Admin accounts can manage roles and statuses.
- **Gallery image not visible immediately:** refresh the mobile home screen or wait for automatic refresh.
- **OTP not received:** check the registered email inbox and spam folder.
