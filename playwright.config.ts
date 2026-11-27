import {defineConfig} from '@playwright/test'
export default defineConfig({testDir:'tests/browser',workers:1,timeout:45000,use:{baseURL:'http://127.0.0.1:4173/AXIOM/',channel:process.env.AXIOM_BROWSER||'msedge',viewport:{width:1360,height:940},acceptDownloads:true},webServer:{command:'node scripts/preview.mjs',url:'http://127.0.0.1:4173/AXIOM/',reuseExistingServer:true}})
