import type { Metadata } from 'next';
import '@fontsource-variable/dm-sans';
import './globals.css';
import './workspace-polish.css';
export const metadata: Metadata = {
 metadataBase: new URL('https://epsilon-customer-ops.info-epsilondev.chatgpt.site'),
 title: 'Customer Operations | Epsilon Labs',
 description: 'Investigate technical support cases with measurable evidence and safe escalation. An independent synthetic-data prototype.',
 openGraph: {title:'Customer Operations | Epsilon Labs',description:'Technical investigations. Clear evidence.',type:'website',images:[{url:'/og.png',width:1731,height:909,alt:'Epsilon Labs Customer Operations — Technical investigations. Clear evidence.'}]},
 twitter: {card:'summary_large_image',title:'Customer Operations | Epsilon Labs',description:'Technical investigations. Clear evidence.',images:['/og.png']},
 icons: { icon: '/favicon.svg' },
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
