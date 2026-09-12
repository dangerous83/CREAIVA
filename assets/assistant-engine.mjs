// Extractive answers: business facts come from public page text, never invented.
export const aliases = {
  'logo-branding': ['logo', 'branding', 'brand identity', 'rebrand', 'شعار', 'هوية'],
  'ai-video-realistic': ['ai video', 'generative video', 'virtual presenter', 'ai imagery', 'فيديو بالذكاء'],
  'motion-design': ['motion design', 'motion graphics', 'kinetic typography', 'logo animation', 'موشن'],
  '2d-animation': ['2d', '2d animation', 'explainer', 'character animation', 'cartoon'],
  '3d-animation': ['3d animation', '3d', 'cad', 'product render', 'product visualization', 'ar ready'],
  'website-design': ['website design', 'website', 'web design', 'landing page', 'webflow', 'framer', 'wordpress', 'موقع'],
  'ecommerce': ['ecommerce', 'e commerce', 'online store', 'online shop', 'shopify', 'storefront', 'tabby', 'tamara', 'متجر'],
  'platform-web': ['platform web', 'crm', 'dashboard', 'erp', 'custom platform', 'workflow automation', 'internal tool'],
  'presentation-pro': ['presentation pro', 'powerpoint', 'keynote', 'pitch deck', 'investor deck', 'slide deck'],
  'interactive-presentation': ['interactive presentation', 'non linear presentation', 'sales demo'],
  'interactive-screen': ['interactive screen', 'touchscreen', 'kiosk', 'touch screen'],
  'photography-videography': ['photography', 'videography', 'photo shoot', 'photoshoot', 'retouch', 'تصوير'],
  'social-media-management': ['social media', 'social management', 'instagram', 'tiktok', 'community management', 'سوشيال'],
  'seo-analytics': ['seo', 'search engine', 'search ranking', 'arabic seo', 'تحسين محركات'],
  'brand-launch-package': ['brand launch', 'brand launch package', 'launch my brand', 'launch a brand'],
  'ai-content-studio': ['ai content studio', 'content studio', 'ai content', 'monthly ai', 'ai assets'],
  'corporate-presentations': ['corporate presentation', 'corporate presentations', 'corporate deck', 'master deck'],
  'digital-marketing-suite': ['digital marketing', 'marketing suite', 'paid ads', 'paid advertising', 'ad spend', 'اعلانات'],
  'ecommerce-web-platforms': ['e commerce web platforms', 'ecommerce web platforms', 'store and backend', 'commerce platform'],
  'growth-analytics': ['growth analytics', 'growth and analytics', 'cro', 'conversion rate optimization'],
  'interactive-experience': ['interactive experience', 'showroom', 'event activation', 'interactive installation']
};
export const normalize = text => String(text).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
const contains = (text, term) => (` ${text} `).includes(` ${normalize(term)} `);
const slug = page => page.path.split('/').pop().replace('.html', '');
const stop = new Set(('a an the is are was were be being do does can could would will you your we our i my it its they them their this that these those what which how when where who why about of for to from with in on at as and or but me us tell please creaiva service services solution solutions need want also yes no').split(' '));
const words = text => normalize(text).split(' ').filter(w => w.length > 1 && !stop.has(w));
const concepts = [
  ['timeline', /\b(how long|timeline|turnaround|deadline|weeks?|months?|delivery time|duration|finish|complete|days?)\b/],
  ['pricing', /\b(price|pricing|cost|costs|budget|quote|fee|fees|how much|retainer|expensive)\b/],
  ['ownership', /\b(own|owns|owned|ownership|rights|source files|native files|editable files)\b/],
  ['platform', /\b(platforms?|technology|technologies|tech stack|framework|build on|software)\b/],
  ['offline', /\b(offline|wi fi|wifi|internet|network outage|without connection)\b/],
  ['arabic', /\b(arabic|english|bilingual|languages?|rtl)\b/],
  ['guarantee', /\b(guarantee|guaranteed|guarantees|first page|number one)\b/],
  ['support', /\b(support|maintenance|after launch|post launch)\b/],
  ['hosting', /\b(hosting|domain|dns|ssl)\b/],
  ['quantity', /\b(how many|quantity|volume|assets per month|photos|slides)\b/],
  ['migration', /\b(migrate|migration|migrating|move from|transfer)\b/],
  ['models', /\b(ai models|which models|model|models|runway|kling|sora|higgsfield)\b/],
  ['hardware', /\b(hardware|installation|install|physical)\b/],
  ['integration', /\b(integrate|integration|integrations|accounting|erp|quickbooks|xero|zoho|sap|odoo)\b/],
  ['voiceover', /\b(voice over|voiceover|casting|narration|voice)\b/],
  ['start', /\b(start|kick off|kickoff|begin)\b/],
  ['international', /\b(international|worldwide|overseas|europe|gcc|outside dubai|outside uae)\b/]
];
function tokens(text) {
  const s = normalize(text);
  return new Set([...words(s), ...concepts.filter(([, re]) => re.test(s)).map(([name]) => `@${name}`)]);
}
function faqMatch(question, pages, entity) {
  let q = question;
  if (entity) {
    for (const alias of [entity.title, ...(aliases[slug(entity)] || [])].sort((a,b) => b.length-a.length)) {
      q = (` ${q} `).replace(` ${normalize(alias)} `, ' ').trim();
    }
  }
  const query = tokens(q);
  const candidates = pages.flatMap(page => page.faqs.map(faq => ({ page, faq })));
  const scored = candidates.map(item => {
    const title = tokens(item.faq.question);
    const answer = tokens(item.faq.answer);
    let score = 0, strong = 0;
    for (const term of query) {
      if (title.has(term)) {
        const count = candidates.filter(c => tokens(c.faq.question).has(term)).length;
        score += term.startsWith('@') ? 5 : 2 + Math.log(1 + candidates.length / count);
        strong++;
      } else if (answer.has(term) && !term.startsWith('@')) score += 1;
    }
    return { ...item, score, strong };
  }).sort((a,b) => b.score-a.score);
  const best = scored[0];
  return best?.strong && best.score >= 5 ? { ...best, alternatives: scored.filter(s => s.strong && s.score >= best.score - 1 && s.page.path !== best.page.path).slice(0, 3) } : null;
}
function source(page, anchor = '') { return { title: page.title, path: page.path + (anchor ? `#${anchor}` : '') }; }
function result(text, pages = [], extra = {}) {
  return { text, sources: pages.map(p => source(p)), topicPath: pages.find(p => p.category !== 'company')?.path || null, ...extra };
}
function entityMatches(q, pages) {
  return pages.filter(p => p.category !== 'company').map(page => {
    const terms = [page.title, ...(aliases[slug(page)] || [])];
    const matched = terms.filter(t => contains(q, t));
    return { page, score: Math.max(0, ...matched.map(t => normalize(t).split(' ').length * 10 + normalize(t).length / 10)) };
  }).filter(x => x.score).sort((a,b) => b.score-a.score);
}
export function answerQuestion(question, knowledge, context = {}) {
  const q = normalize(question).slice(0, 1200);
  const pages = knowledge.pages;
  const home = pages.find(p => p.path === 'index.html');
  const contact = pages.find(p => p.path === 'contact.html');
  const unknown = (page) => result("I couldn't confirm that detail in CREAIVA's public website content. The team can confirm it for your project; use the contact link below.", page ? [page, contact] : [contact], { kind: 'unconfirmed' });
  if (!q) return result('Ask me about a CREAIVA service, solution, or how to start a project.');
  if (/\b(password|secret|api key|system prompt|internal pricing|sales portal|sales pricing|discount code)\b/.test(q)) return unknown();
  if (/^(hi|hello|hey|salam|marhaba|مرحبا|اهلا)( there)?$/.test(q)) return result('Hello! I can help you explore CREAIVA’s services and solutions, check published details, or reach the team. What are you working on?');
  if (/^(thanks|thank you|thank you very much)$/.test(q)) return result('You’re welcome! I’m here if you have another question about CREAIVA.');
  if (/\b(what is creaiva|about creaiva|who are you|what does creaiva do)\b/.test(q)) return result(home.summary, [home]);

  const matches = entityMatches(q, pages);
  const explicit = matches[0]?.page;
  const global = /\b(all services|all solutions|what services|what solutions|contact|email|phone|whatsapp|office hours|business hours|where are you|where is creaiva|international|who owns|how do you price)\b/.test(q);
  const remembered = pages.find(p => p.path === context.topicPath);
  const current = pages.find(p => p.path === context.pagePath && p.category !== 'company');
  const contextualPage = /\b(this page|current page)\b/.test(q) ? current : remembered || current;
  const exactContextFaq = contextualPage?.faqs.some(f => normalize(f.question) === q);
  const entity = (exactContextFaq ? contextualPage : explicit) || (!global ? contextualPage : null);

  if (/\b(refund|refunds|cancellation|certification|tax registration|trade license|discount|discounts)\b/.test(q)) return unknown(entity);

  const exact = (entity ? [entity] : [home]).flatMap(page => page.faqs.map(faq => ({ page, faq })))
    .find(item => normalize(item.faq.question) === q);
  if (exact) return result(exact.faq.answer, [exact.page], { sources: [source(exact.page, exact.faq.anchor)] });

  if (/\b(compare|versus|vs|difference|different)\b/.test(q) && matches.length > 1) {
    // Prefer separately named entities over a short alias embedded in another name.
    const chosen = matches.slice(0, 2).map(x => x.page);
    return result(chosen.map(p => `${p.title}\n${p.summary}${p.combines.length ? '\nCombines: ' + p.combines.map(x => x.title).join(', ') + '.' : ''}`).join('\n\n'), chosen);
  }
  if (!entity && /\b(services|disciplines|what do you offer|what can you do)\b/.test(q)) {
    const services = pages.filter(p => p.category === 'service');
    return result(`CREAIVA offers ${services.length} services. Select a page below to see its scope, process, and FAQs. You can book one service or combine services in a solution.`, [home, ...services], { kind: 'catalog' });
  }
  if (!entity && /\b(solutions|bundles|packages)\b/.test(q)) {
    const solutions = pages.filter(p => p.category === 'solution');
    return result(`CREAIVA has ${solutions.length} packaged solutions. Each combines related services around a business goal. Select a solution below for its scope and included services.`, solutions, { kind: 'catalog' });
  }
  if (/\b(contact|email|phone|call you|reach you|whatsapp|talk to|speak to|start a project|hire you|book a call|book a meeting)\b/.test(q)) {
    const details = contact.contacts.filter(x => /WhatsApp|Customer|Email/.test(x.title));
    return result(`${details.map(x => `${x.title}: ${x.text}`).join('\n')}\n\n${contact.summary}`, [contact], { kind: 'contact' });
  }
  if (/\b(hours|opening|open today|weekend|sunday|friday|saturday|timezone)\b/.test(q)) {
    const hours = contact.contacts.find(x => x.title === 'Hours');
    return result(hours?.text || contact.summary, [contact]);
  }
  if (/\b(where|location|located|address|based|studio in)\b/.test(q) && !explicit) {
    const studio = contact.contacts.find(x => x.title === 'Studio');
    return result(`${studio?.text || contact.summary}${q.includes('address') ? '\nThe public contact page does not list a street address. Please contact the team for visit details.' : ''}`, [contact]);
  }
  if (/\b(team|people|founder|ceo|staff)\b/.test(q) && !explicit) {
    const page = pages.find(p => p.path === 'our-team.html');
    if (/\b(founder|ceo|names|name)\b/.test(q)) return unknown(page);
    const section = page.sections.find(s => s.anchor === 'team');
    return result([page.summary, ...(section?.paragraphs || [])].join('\n\n'), [page]);
  }
  if (/\b(portfolio|case stud|case studies|previous work|past work|work examples|clients)\b/.test(q) && !explicit && !q.includes('international')) {
    const page = pages.find(p => p.path === 'portfolio.html');
    const section = page.sections.find(s => s.anchor === 'work');
    return result(`The CREAIVA portfolio page describes these examples:\n\n${(section?.paragraphs || [page.summary]).join('\n\n')}`, [page]);
  }
  const included = /\b(include|includes|included|deliverables|scope|receive|get with|comes with|consist|contain|combine|combines)\b/.test(q);
  const timeline = /\b(how long|timeline|turnaround|deadline|how many weeks|how many days|finish|complete)\b/.test(q);
  const process = /\b(process|phases|steps|how does it work|how do you work)\b/.test(q);
  const pricing = /\b(price|pricing|cost|budget|how much|quote|retainer|fee|fees|aed|discount)\b/.test(q);
  if (entity && included && !/\b(hosting|source files|support|voice|rights|seo)\b/.test(q)) {
    return result(`${entity.title} includes:\n\n${entity.deliverables.map(x => `• ${x.title}: ${x.text}`).join('\n')}${entity.combines.length ? '\n\nCombines: ' + entity.combines.map(x => x.title).join(', ') + '.' : ''}`, [entity]);
  }
  if (entity && (timeline || process) && entity.process.length && !/\b(spot|video length|seconds|minutes)\b/.test(q)) {
    return result(`The published ${entity.title} engagement is:\n\n${entity.process.map(x => `• ${x.title}: ${x.text}`).join('\n')}\n\nThe team can confirm the schedule for your brief.`, [entity]);
  }
  let faq = faqMatch(q, entity ? [entity] : [home], entity);
  // General pricing is a company policy; service-specific costs remain scoped.
  if (pricing && (!faq || !/\b(cost|price|fee|spend)\b/.test(normalize(faq.faq.question)))) faq = faqMatch('how do you price projects', [home]);
  if (!faq && !entity) {
    faq = faqMatch(q, pages);
    if (faq?.alternatives.length) return result('That detail depends on the service or solution. Which of these are you asking about? Type its name and I can explain its published details.', [faq.page, ...faq.alternatives.map(x => x.page)], { kind: 'clarify', topicPath: null });
  }
  if (faq) return result(`${entity && faq.page === entity ? entity.title + '\n' : ''}${faq.faq.answer}`, [faq.page], {
    sources: [source(faq.page, faq.faq.anchor)], topicPath: entity?.path || null, kind: 'answer'
  });
  if (entity) {
    const plain = words(q).filter(w => !words(entity.title + ' ' + (aliases[slug(entity)] || []).join(' ')).includes(w));
    const isOverview = !plain.length || /\b(tell me about|explain|overview|interested in|looking for|learn about|recommend|i need|i want|i would like)\b/.test(q) ||
      /^(do you (offer|provide|make|create|build|design)|can you (make|create|build|design))\b/.test(q) && plain.every(w => ['offer','provide','make','create','build','design','please'].includes(w));
    if (isOverview) return result(`${entity.summary}\n\nIncluded: ${entity.deliverables.map(x => x.title).join(', ')}.${entity.combines.length ? '\n\nCombines: ' + entity.combines.map(x => x.title).join(', ') + '.' : ''}`, [entity]);
    // Retrieve precise deliverable details only with substantial overlap.
    const query = words(q).filter(w => !words(entity.title).includes(w));
    const card = entity.deliverables.map(c => ({ c, hits: query.filter(w => words(c.title + ' ' + c.text).includes(w)).length })).sort((a,b) => b.hits-a.hits)[0];
    if (card?.hits >= 2) return result(`${entity.title} — ${card.c.title}\n${card.c.text}`, [entity]);
    return unknown(entity);
  }
  return unknown();
}
