// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
    site: 'https://eduardopech.github.io',
    base: '/chess-board',
    prefetch: false,
    integrations: [starlight({
        title: 'chess-board',
        description: 'Chess board UI library — render and interact with chess positions.',
        social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/EduardoPech/chess-board' }],
        sidebar: [
            { label: 'Getting Started', items: [{ label: 'Install', slug: 'getting-started/install' }, { label: 'Usage', slug: 'getting-started/usage' }] },
            {
                label: 'Guides',
                items: [
                    { label: 'Example', slug: 'guides/example' },
                    { label: 'Options', slug: 'guides/options' },
                    { label: 'Integration with chess-core', slug: 'guides/integration-chess-core' },
                ],
            },
            { label: 'Reference', items: [{ label: 'API', slug: 'reference/api' }] },
        ],
		}), react()],
});