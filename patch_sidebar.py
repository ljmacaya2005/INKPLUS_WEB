import os
import glob

files = glob.glob('*.html')

target_string = '''                    <li class="nav-item">
                        <a href="settings.html" class="nav-link">'''

replacement_string = '''                    <li class="nav-item">
                        <a href="services.html" class="nav-link">
                            <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                            </svg>
                            <span>Service Catalog</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="settings.html" class="nav-link">'''

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    if target_string in content and 'services.html' not in content:
        content = content.replace(target_string, replacement_string)
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f"Patched {f}")

# Also replace the active state if the file is settings.html wait, the target_string for settings.html has "nav-link active" if it is the active one!
# Let's check if settings has active
target_active = '''                    <li class="nav-item">
                        <a href="settings.html" class="nav-link active">'''
replacement_active = '''                    <li class="nav-item">
                        <a href="services.html" class="nav-link">
                            <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                            </svg>
                            <span>Service Catalog</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="settings.html" class="nav-link active">'''

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    if target_active in content and 'services.html' not in content:
        content = content.replace(target_active, replacement_active)
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f"Patched {f} (active state)")

