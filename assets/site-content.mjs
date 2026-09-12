// One extractor for the checked-in index and live public-page refreshes.
const clean = node => (node?.textContent || '').replace(/\s+/g, ' ').trim();
export function extractPage(document, path) {
  const title = clean(document.querySelector('title')).split(' — ')[0];
  const intro = document.querySelector('.page-hero, #about');
  const summary = clean(intro?.querySelector('.about-text > p:not(.breadcrumb), .section-head > p:not(.breadcrumb), .container > p:not(.breadcrumb)')) ||
    document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const faqs = [...document.querySelectorAll('details.faq, details.hfaq')].map((el, i) => ({
    question: clean(el.querySelector('summary')),
    answer: clean(el.querySelector('.faq-body, .hfaq-body')),
    anchor: el.id || (el.closest('section')?.id || '')
  }));
  const cards = selector => [...document.querySelectorAll(selector)].map(el => ({
    title: clean(el.querySelector('h3, h4')),
    text: [...el.querySelectorAll('.dur, p')].map(clean).join(' — ')
  })).filter(x => x.title && x.text);
  const sections = [...document.querySelectorAll('body > section')].map(section => {
    const copy = section.cloneNode(true);
    copy.querySelectorAll('script, style, form, svg, .breadcrumb, .hero-ctas, .combines-row, .related-strip, details, .ai-panel').forEach(el => el.remove());
    return {
      title: clean(copy.querySelector('h1, h2, h3')),
      anchor: section.id || '',
      paragraphs: [...copy.querySelectorAll('p, li, .cinfo-val')].map(clean).filter(Boolean)
    };
  }).filter(x => x.title && x.paragraphs.length);
  return {
    path, title: path === 'index.html' ? 'About CREAIVA' : title,
    category: path.startsWith('services/') ? 'service' : path.startsWith('solutions/') ? 'solution' : 'company',
    summary, faqs, deliverables: cards('.info-card'), process: cards('.timeline-step, .process-step'),
    contacts: [...document.querySelectorAll('.cinfo-item')].map(el => ({
      title: clean(el.querySelector('strong')), text: clean(el.querySelector('.ci-txt > span'))
    })),
    combines: [...document.querySelectorAll('.combines-row .items a')].map(a => ({
      title: clean(a), path: a.getAttribute('href').replace(/^\.\.\//, '')
    })), sections
  };
}
