const fs = require('fs');
const path = require('path');

const baseHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notara — AI Notes</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,400;0,500;1,400&family=Instrument+Serif:ital@0;1&family=Syne:wght@700;800&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/@phosphor-icons/web"></script>
    <style>
/* CSS VARIABLES & BASE */
${fs.existsSync('base.css') ? fs.readFileSync('base.css', 'utf8') : ''}

/* LAYOUT */
${fs.existsSync('layout.css') ? fs.readFileSync('layout.css', 'utf8') : ''}

/* COMPONENTS */
${fs.existsSync('components.css') ? fs.readFileSync('components.css', 'utf8') : ''}
    </style>
</head>
<body>
    <div class="bg-grid"></div>
    <div class="bg-orbs">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
    </div>

${fs.existsSync('splash.html') ? fs.readFileSync('splash.html', 'utf8') : ''}
${fs.existsSync('auth.html') ? fs.readFileSync('auth.html', 'utf8') : ''}
${fs.existsSync('app.html') ? fs.readFileSync('app.html', 'utf8') : ''}
${fs.existsSync('modals.html') ? fs.readFileSync('modals.html', 'utf8') : ''}

    <script type="module">
${fs.existsSync('firebase.js') ? fs.readFileSync('firebase.js', 'utf8') : ''}
    </script>
    
    <script>
${fs.existsSync('utils.js') ? fs.readFileSync('utils.js', 'utf8') : ''}
${fs.existsSync('auth_logic.js') ? fs.readFileSync('auth_logic.js', 'utf8') : ''}
${fs.existsSync('notes_logic.js') ? fs.readFileSync('notes_logic.js', 'utf8') : ''}
${fs.existsSync('ai_logic.js') ? fs.readFileSync('ai_logic.js', 'utf8') : ''}
${fs.existsSync('main.js') ? fs.readFileSync('main.js', 'utf8') : ''}
    </script>
</body>
</html>`;

fs.writeFileSync('index.html', baseHtml);
console.log('index.html assembled successfully!');
