// Original flat-vector illustrated avatars (not emoji): a mix of feminine
// and masculine characters, built from simple shapes so they render crisply
// at any size and stay tiny to ship inline with no image assets.
const SKIN = ['#F2C9A0', '#E0A972', '#C68863', '#8D5524'];
const SMILE = 'M25,41 Q32,46 39,41';

// Each avatar gets its own gradient id (derived from the bg color) so
// several avatars can render on the same page without one's <defs> clobbering
// another's - inline SVGs share one document-wide id namespace.
let gradCounter = 0;

function svg(bg, inner) {
  const gid = `av-bg-${gradCounter++}`;
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img">
    <defs>
      <radialGradient id="${gid}" cx="35%" cy="30%" r="75%">
        <stop offset="0" stop-color="${bg}" stop-opacity="0.75"/>
        <stop offset="1" stop-color="${bg}"/>
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="32" fill="url(#${gid})"/>
    <ellipse cx="24" cy="16" rx="16" ry="9" fill="#fff" opacity="0.14"/>
    ${inner}
  </svg>`;
}

function face(skin, mouth = SMILE) {
  return `
    <ellipse cx="32" cy="37" rx="14" ry="16" fill="${skin}"/>
    <ellipse cx="26" cy="30" rx="5" ry="3.4" fill="#fff" opacity="0.18"/>
    <circle cx="26" cy="35" r="2.1" fill="#2b2b2b"/>
    <circle cx="38" cy="35" r="2.1" fill="#2b2b2b"/>
    <ellipse cx="27" cy="42" rx="3.4" ry="1.8" fill="#e8907a" opacity="0.35"/>
    <ellipse cx="37" cy="42" rx="3.4" ry="1.8" fill="#e8907a" opacity="0.35"/>
    <path d="${mouth}" stroke="#7a4a3a" stroke-width="2" fill="none" stroke-linecap="round"/>
  `;
}

export const AVATARS = [
  {
    id: 'f-ponytail', gender: 'f', level: 1,
    svg: svg('#FF6B9D', `
      <ellipse cx="32" cy="25" rx="16" ry="14" fill="#4A2C2A"/>
      <ellipse cx="49" cy="32" rx="5" ry="11" fill="#4A2C2A" transform="rotate(24 49 32)"/>
      ${face(SKIN[0])}
    `),
  },
  {
    id: 'm-shortbrown', gender: 'm', level: 1,
    svg: svg('#4FC3F7', `
      <ellipse cx="32" cy="23" rx="15" ry="11" fill="#5D4037"/>
      ${face(SKIN[1])}
    `),
  },
  {
    id: 'f-curly', gender: 'f', level: 2,
    svg: svg('#FFB74D', `
      <g fill="#B33F1E">
        <circle cx="18" cy="23" r="6.5"/><circle cx="24" cy="15" r="6.5"/><circle cx="32" cy="12" r="6.5"/>
        <circle cx="40" cy="15" r="6.5"/><circle cx="46" cy="23" r="6.5"/><circle cx="13" cy="31" r="5.5"/><circle cx="51" cy="31" r="5.5"/>
      </g>
      ${face(SKIN[2])}
    `),
  },
  {
    id: 'm-afro', gender: 'm', level: 3,
    svg: svg('#66BB6A', `
      <circle cx="32" cy="24" r="19" fill="#222"/>
      ${face(SKIN[3])}
    `),
  },
  {
    id: 'f-bob-headband', gender: 'f', level: 5,
    svg: svg('#BA68C8', `
      <ellipse cx="32" cy="24" rx="17" ry="15" fill="#F4D03F"/>
      <rect x="16" y="26" width="8" height="20" rx="4" fill="#F4D03F"/>
      <rect x="40" y="26" width="8" height="20" rx="4" fill="#F4D03F"/>
      ${face(SKIN[0])}
      <rect x="17" y="21" width="30" height="4.5" rx="2.25" fill="#FF4D8D"/>
    `),
  },
  {
    id: 'm-cap', gender: 'm', level: 7,
    svg: svg('#FF7043', `
      <ellipse cx="32" cy="25" rx="15" ry="10" fill="#3E3E3E"/>
      ${face(SKIN[1])}
      <path d="M15,25 Q32,6 49,25 Q49,18 32,18 Q15,18 15,25 Z" fill="#1E3A8A"/>
      <ellipse cx="44" cy="25" rx="9" ry="3" fill="#1E3A8A"/>
    `),
  },
  {
    id: 'f-longhair', gender: 'f', level: 9,
    svg: svg('#26C6DA', `
      <path d="M16,24 Q16,10 32,10 Q48,10 48,24 L50,52 Q47,57 43,52 L43,30 Q32,24 21,30 L21,52 Q17,57 14,52 Z" fill="#2B2B2B"/>
      ${face(SKIN[2])}
      <line x1="32" y1="12" x2="32" y2="24" stroke="#000" stroke-width="1" opacity="0.25"/>
    `),
  },
  {
    id: 'm-beard', gender: 'm', level: 12,
    svg: svg('#90A4AE', `
      ${face(SKIN[3], 'M27,42 Q32,44 37,42')}
      <path d="M19,40 Q32,56 45,40 L45,47 Q32,60 19,47 Z" fill="#3E2723"/>
    `),
  },
  {
    id: 'f-buns-visor', gender: 'f', level: 15,
    svg: svg('#FFD54F', `
      <ellipse cx="32" cy="25" rx="15" ry="10" fill="#6D4C41"/>
      <circle cx="19" cy="15" r="6.5" fill="#6D4C41"/>
      <circle cx="45" cy="15" r="6.5" fill="#6D4C41"/>
      ${face(SKIN[0])}
      <rect x="17" y="27" width="30" height="5" rx="2.5" fill="#222"/>
    `),
  },
  {
    id: 'm-glasses', gender: 'm', level: 18,
    svg: svg('#7E57C2', `
      <path d="M16,25 Q19,10 33,11 Q48,12 47,26 Q40,15 30,15 Q19,15 16,25 Z" fill="#212121"/>
      ${face(SKIN[1])}
      <circle cx="26" cy="35" r="5.2" fill="none" stroke="#212121" stroke-width="2"/>
      <circle cx="38" cy="35" r="5.2" fill="none" stroke="#212121" stroke-width="2"/>
      <line x1="31.2" y1="35" x2="32.8" y2="35" stroke="#212121" stroke-width="2"/>
    `),
  },
  {
    id: 'f-side-braid', gender: 'f', level: 20,
    svg: svg('#9575CD', `
      <ellipse cx="32" cy="24" rx="15" ry="12" fill="#D4A24C"/>
      <g fill="#D4A24C"><ellipse cx="44" cy="34" rx="4" ry="5"/><ellipse cx="45" cy="42" rx="3.6" ry="5"/><ellipse cx="45" cy="50" rx="3.2" ry="5"/></g>
      ${face(SKIN[0])}
    `),
  },
  {
    id: 'm-buzzcut', gender: 'm', level: 22,
    svg: svg('#FF8A65', `
      <ellipse cx="32" cy="24" rx="14.5" ry="8" fill="#3E2723"/>
      ${face(SKIN[2])}
    `),
  },
  {
    id: 'f-punk-buns', gender: 'f', level: 24,
    svg: svg('#EC407A', `
      <ellipse cx="32" cy="24" rx="14" ry="9" fill="#AB47BC"/>
      <circle cx="19" cy="14" r="6" fill="#AB47BC"/><circle cx="45" cy="14" r="6" fill="#AB47BC"/>
      ${face(SKIN[1])}
    `),
  },
  {
    id: 'm-mohawk', gender: 'm', level: 26,
    svg: svg('#00897B', `
      <path d="M29,5 L35,5 L34,27 Q32,25 30,27 Z" fill="#212121"/>
      ${face(SKIN[3])}
    `),
  },
  {
    id: 'f-racket-bow', gender: 'f', level: 28,
    svg: svg('#F8BBD0', `
      <circle cx="32" cy="22" r="13" fill="none" stroke="#fff" stroke-width="3"/>
      <rect x="29" y="33" width="6" height="18" rx="3" fill="#fff"/>
      <g fill="#fff" opacity="0.9">
        <circle cx="26" cy="18" r="1"/><circle cx="32" cy="15" r="1"/><circle cx="38" cy="18" r="1"/>
        <circle cx="24" cy="24" r="1"/><circle cx="32" cy="22" r="1"/><circle cx="40" cy="24" r="1"/>
        <circle cx="26" cy="29" r="1"/><circle cx="38" cy="29" r="1"/>
      </g>
      <path d="M26,49 Q32,44 38,49 Q32,52 26,49 Z" fill="#E91E63"/>
      <circle cx="32" cy="49" r="2" fill="#C2185B"/>
    `),
  },
  {
    id: 'm-racket-band', gender: 'm', level: 30,
    svg: svg('#42A5F5', `
      <circle cx="32" cy="22" r="13" fill="none" stroke="#fff" stroke-width="3"/>
      <rect x="29" y="33" width="6" height="18" rx="3" fill="#fff"/>
      <g fill="#fff" opacity="0.9">
        <circle cx="26" cy="18" r="1"/><circle cx="32" cy="15" r="1"/><circle cx="38" cy="18" r="1"/>
        <circle cx="24" cy="24" r="1"/><circle cx="32" cy="22" r="1"/><circle cx="40" cy="24" r="1"/>
        <circle cx="26" cy="29" r="1"/><circle cx="38" cy="29" r="1"/>
      </g>
      <rect x="26" y="44" width="12" height="6" rx="3" fill="#212121"/>
    `),
  },
  {
    id: 'f-heart', gender: 'f', level: 33,
    svg: svg('#F06292', `
      <circle cx="24" cy="24" r="10" fill="#fff"/><circle cx="40" cy="24" r="10" fill="#fff"/>
      <rect x="19" y="24" width="26" height="26" fill="#fff" transform="rotate(45 32 34)"/>
    `),
  },
  {
    id: 'm-mustache-bowtie', gender: 'm', level: 36,
    svg: svg('#8D6E63', `
      <path d="M16,32 Q22,24 28,30 Q32,27 32,27 Q32,27 36,30 Q42,24 48,32 Q42,30 36,33 Q32,30 32,30 Q32,30 28,33 Q22,30 16,32 Z" fill="#fff"/>
      <path d="M22,44 L32,40 L22,36 Z" fill="#fff"/><path d="M42,44 L32,40 L42,36 Z" fill="#fff"/>
      <circle cx="32" cy="40" r="2.5" fill="#5D4037"/>
    `),
  },
];

export function avatarById(id) {
  return AVATARS.find((a) => a.id === id) || AVATARS[0];
}

export function avatarSvg(id) {
  return avatarById(id).svg;
}
