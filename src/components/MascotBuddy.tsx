import { useState } from 'react';
import { Heart, Sparkles } from 'lucide-react';

type MascotBuddyProps = {
  title: string;
  detail: string;
  mood?: 'happy' | 'ready' | 'start';
};

export function MascotBuddy({ title, detail, mood = 'ready' }: MascotBuddyProps) {
  const [expanded, setExpanded] = useState(false);
  return <button className={`mascot-buddy mascot-buddy-${mood}${expanded ? ' expanded' : ''}`} type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
    <span className="mascot-buddy-art"><img src="/illustrations/meowku-checklist-cat.webp" alt="Maskot Meowku" /></span>
    <span className="mascot-buddy-copy"><span className="mascot-buddy-eyebrow"><Sparkles size={13} /> TEMAN MEOWKU</span><strong>{title}</strong>{expanded && <small>{detail}</small>}</span>
    <span className="mascot-buddy-heart" aria-hidden="true"><Heart size={15} /></span>
  </button>;
}
