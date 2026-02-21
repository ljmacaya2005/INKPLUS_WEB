const fs = require('fs');
const glob = require('glob');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

const target_string = `                    <li class="nav-item">
                        <a href="settings.html" class="nav-link">`;

const replacement_string = `                    <li class="nav-item">
                        <a href="services.html" class="nav-link">
                            <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                            </svg>
                            <span>Service Catalog</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="settings.html" class="nav-link">`;

const target_active = `                    <li class="nav-item">
                        <a href="settings.html" class="nav-link active">`;

const replacement_active = `                    <li class="nav-item">
                        <a href="services.html" class="nav-link">
                            <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                            </svg>
                            <span>Service Catalog</span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <a href="settings.html" class="nav-link active">`;

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let patched = false;

    if (content.includes(target_string) && !content.includes('services.html')) {
        content = content.split(target_string).join(replacement_string);
        patched = true;
    }

    if (content.includes(target_active) && !content.includes('services.html')) {
        content = content.split(target_active).join(replacement_active);
        patched = true;
    }

    if (patched) {
        fs.writeFileSync(f, content, 'utf8');
        console.log('Patched ' + f);
    }
});
