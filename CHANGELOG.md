# Changelog - DevBench Manager Updates

## Changes Made

### 1. Updated SSH Access Configuration
- **File**: `provision_vm.sh`
- **Changes**: 
  - Updated SSH connection to use port 49152
  - Changed SSH host to `asf@asf-server.duckdns.org -p 49152`
  - Modified SSH command to include port parameter

### 2. Updated Output Parsing
- **File**: `provision_vm.sh`
- **Changes**:
  - Now extracts SSH Port and VNC Port from script output
  - Removed IP address extraction
  - Parses output format: `SSH Port: XXXX` and `VNC Port: XXXX`
  - Extracts VM name from success message

### 3. Updated Server-Side Processing
- **File**: `server.js`
- **Changes**:
  - Modified DevBench creation to parse new output format (SSH_PORT, VNC_PORT, VM_NAME)
  - Stores only port numbers in database (ssh_info and vnc_info fields)
  - Removed vm_ip field from database schema
  - Added `/help` route for help page

### 4. Updated User Interface
- **File**: `views/dashboard.ejs`
- **Changes**:
  - Display "SSH Port" instead of full SSH command
  - Display "VNC Port" instead of full VNC info
  - Added link to help page in connection info section
  - Improved visual presentation with larger font for ports

### 5. Updated Admin Interface
- **File**: `views/admin.ejs`
- **Changes**:
  - Replaced "IP Address" column with "SSH Port" and "VNC Port" columns
  - Shows port numbers for each DevBench

### 6. Added Help Page
- **File**: `views/help.ejs` (NEW)
- **Features**:
  - Step-by-step guide for using SSH Config Manager tool
  - Instructions for configuring SSH access
  - Download link for SSH Config Manager
  - Connection information and important notes
  - Styled with Bootstrap cards and custom CSS

### 7. Updated Navigation
- **File**: `views/layout.ejs`
- **Changes**:
  - Added Help icon/link in navbar
  - Added TBM icon (tbm-icon.png) in navbar
  - Added favicon using TBM icon
  - Help link accessible from all pages

### 8. Added Downloadable Tool
- **Location**: `public/downloads/db_vm_ssh_config_manager.exe`
- **Purpose**: SSH configuration management tool
- **Access**: Available at `/downloads/db_vm_ssh_config_manager.exe`

### 9. Added TBM Icon
- **Location**: `public/images/tbm-icon.png`
- **Usage**: 
  - Favicon for all pages
  - Icon in navbar next to logo
  - Branding element

### 10. Updated Documentation
- **File**: `README.md`
- **Changes**:
  - Added SSH Configuration section
  - Updated database schema documentation
  - Added help page to user features
  - Updated project structure
  - Added help route to API endpoints

## Summary of User-Facing Changes

### For Users:
1. **Simplified Connection Info**: Now shows only SSH Port and VNC Port numbers
2. **Help Page**: Accessible via navbar, provides detailed setup instructions
3. **SSH Config Tool**: Downloadable tool to simplify SSH configuration
4. **Visual Improvements**: TBM icon added to branding

### For Administrators:
1. **Updated Admin Dashboard**: Shows SSH and VNC ports instead of IP addresses
2. **Same management capabilities**: All admin functions remain unchanged

## Technical Details

### SSH Connection Format:
- **Old**: Full SSH command string
- **New**: Port number only (e.g., "6004")

### VNC Connection Format:
- **Old**: Full VNC connection string
- **New**: Port number only (e.g., "5004")

### Database Changes:
- Removed: `vm_ip` field
- Modified: `ssh_info` now stores SSH port number
- Modified: `vnc_info` now stores VNC port number

## Testing Recommendations

1. Test DevBench creation with new output parsing
2. Verify SSH port and VNC port display correctly
3. Test help page accessibility
4. Verify SSH Config Manager download
5. Check TBM icon display on all pages
6. Test on different browsers for favicon display

## Migration Notes

If you have existing DevBenches in the database:
- Old entries may still have full SSH/VNC strings or IP addresses
- New entries will have port numbers only
- Consider running a migration script if needed to update old entries
