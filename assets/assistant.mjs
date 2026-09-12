import { answerQuestion } from './assistant-engine.mjs';
import { extractPage } from './site-content.mjs';

const root = new URL('../', import.meta.url);
const pagePath = decodeURIComponent(location.pathname).startsWith(root.pathname)
  ? decodeURIComponent(location.pathname).slice(root.pathname.length) || 'index.html' : 'index.html';
const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-11.6 7.2L3 20l1.3-5.4A8 8 0 1 1 20 11.5Z"/><path d="M8 11h.01M12 11h.01M16 11h.01" stroke-width="3" stroke-linecap="round"/></svg>';
const launchers = document.createElement('div');
launchers.className = 'ca-launchers';
const whatsappIcon = '<svg viewBox="0 0 32 32" width="28" height="28" fill="currentColor" aria-hidden="true"><path d="M16 3C9 3 3.5 8.5 3.5 15.5c0 2.4.7 4.7 1.9 6.7L3 29l7-1.8c1.9 1 4 1.6 6.1 1.6 7 0 12.5-5.5 12.5-12.5S23 3 16 3zm0 22.8c-1.9 0-3.7-.5-5.3-1.5l-.4-.2-3.9 1 1-3.8-.2-.4c-1.1-1.7-1.6-3.6-1.6-5.6C5.6 9.7 10.2 5.2 16 5.2s10.4 4.5 10.4 10.3S21.8 25.8 16 25.8zm5.7-7.7c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1c-1.8-.9-3-1.6-4.2-3.6-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5s-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.2 4.6 2 .8 2.7.9 3.7.8.6-.1 1.8-.7 2.1-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.2-.6-.4z"/></svg>';
launchers.innerHTML = `<a class="ca-whatsapp" href="https://wa.me/971521559156" target="_blank" rel="noopener" aria-label="Chat with CREAIVA on WhatsApp">${whatsappIcon}</a><button class="ca-launch" type="button" aria-haspopup="dialog" aria-controls="creaiva-assistant" aria-expanded="false">${icon}<span>Ask CREAIVA</span></button>`;
const panel = document.createElement('dialog');
panel.id = 'creaiva-assistant';
panel.className = 'ca-panel';
panel.setAttribute('aria-labelledby', 'ca-title');
panel.innerHTML = `<div class="ca-head"><span class="ca-avatar">${icon}</span><div><h2 id="ca-title">CREAIVA Assistant</h2><p class="ca-status">Answers from our website</p></div><button type="button" class="ca-close" aria-label="Close assistant">×</button></div><div class="ca-messages" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation"></div><div class="ca-quick"></div><form class="ca-form"><input aria-label="Ask about CREAIVA" placeholder="Ask about CREAIVA…" maxlength="1000" autocomplete="off" required><button type="submit">Send</button></form><p class="ca-note">Based on public website information. Confirm project quotes and availability with our team.</p>`;
document.body.append(launchers, panel);
const launch = launchers.querySelector('button');
const messages = panel.querySelector('.ca-messages');
const quick = panel.querySelector('.ca-quick');
const input = panel.querySelector('input');
const status = panel.querySelector('.ca-status');
let knowledgePromise, knowledge, topicPath, busy = false;
const refreshed = new Map();
function message(text, user = false) {
  const article = document.createElement('div');
  article.className = `ca-message${user ? ' ca-user' : ''}`;
  const p = document.createElement('p');
  p.textContent = text;
  article.append(p);
  messages.append(article);
  messages.scrollTop = messages.scrollHeight;
  return article;
}
function sources(article, items) {
  if (!items.length) return;
  const nav = document.createElement('nav');
  nav.className = 'ca-sources';
  nav.setAttribute('aria-label', 'Website sources');
  for (const item of items) {
    if (!knowledge?.pages.some(p => p.path === item.path.split('#')[0])) continue;
    const a = document.createElement('a');
    a.href = new URL(item.path, root).href;
    a.textContent = item.title + ' ↗';
    nav.append(a);
  }
  article.append(nav);
}
async function readJSON(url) {
  const response = await fetch(url, { cache: 'no-cache', signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error('Content unavailable');
  return response.json();
}
function loadKnowledge() {
  if (!knowledgePromise) knowledgePromise = readJSON(new URL('assets/site-knowledge.json', root)).then(data => {
    if (data.version !== 1 || !Array.isArray(data.pages) || !data.pages.length) throw new Error('Invalid content index');
    knowledge = data;
    // The currently rendered page is always the freshest source for page context.
    const index = knowledge.pages.findIndex(p => p.path === pagePath);
    if (index !== -1) knowledge.pages[index] = extractPage(document, pagePath);
    refreshed.set(pagePath, Date.now());
    return data;
  }).catch(error => { knowledgePromise = null; throw error; });
  return knowledgePromise;
}
async function refreshSources(paths) {
  const results = await Promise.allSettled([...new Set(paths)].map(async path => {
    if (Date.now() - (refreshed.get(path) || 0) < 60000) return;
    const index = knowledge.pages.findIndex(p => p.path === path);
    if (index === -1) return;
    const response = await fetch(new URL(path, root), { cache: 'no-cache', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Page unavailable');
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    if (!doc.querySelector('title')?.textContent.includes('CREAIVA')) throw new Error('Unexpected page');
    knowledge.pages[index] = extractPage(doc, path);
    refreshed.set(path, Date.now());
  }));
  return results.every(r => r.status === 'fulfilled');
}
function suggestions() {
  quick.replaceChildren();
  const options = (pagePath.startsWith('services/') || pagePath.startsWith('solutions/'))
    ? [['What’s included?', 'What is included on this page?'], ['Timeline', 'What is the timeline?'], ['Our services', 'What services do you offer?']]
    : [['Our services', 'What services do you offer?'], ['Our solutions', 'What solutions do you offer?'], ['Start a project', 'How do I start a project?']];
  for (const [label, question] of options) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label;
    button.addEventListener('click', () => submit(question));
    quick.append(button);
  }
}
async function submit(question) {
  const text = question.trim().slice(0, 1000);
  if (!text || busy) return;
  busy = true;
  input.value = '';
  message(text, true);
  const waiting = document.createElement('div');
  waiting.className = 'ca-message'; waiting.textContent = 'Checking our website…';
  messages.append(waiting);
  panel.querySelectorAll('form button, .ca-quick button').forEach(b => b.disabled = true);
  let responseElement;
  try {
    await loadKnowledge();
    let answer = answerQuestion(text, knowledge, { pagePath, topicPath });
    const paths = [...answer.sources.slice(0, 3).map(s => s.path.split('#')[0]), 'index.html', 'contact.html'];
    const fresh = await refreshSources(paths);
    answer = answerQuestion(text, knowledge, { pagePath, topicPath });
    status.textContent = fresh ? 'Answers from our website' : 'Saved website information · check sources for updates';
    waiting.remove();
    const article = message(answer.text);
    responseElement = article;
    sources(article, answer.sources);
    topicPath = answer.topicPath;
  } catch {
    waiting.remove();
    const article = message('I couldn’t load the website information just now. Please try again, or contact CREAIVA at info@creaiva.ae or +971 52 155 9156.');
    responseElement = article;
    const a = document.createElement('a');
    a.href = new URL('contact.html', root).href; a.textContent = 'Contact CREAIVA →';
    const links = document.createElement('div'); links.className = 'ca-sources'; links.append(a); article.append(links);
  } finally {
    busy = false;
    panel.querySelectorAll('form button, .ca-quick button').forEach(b => b.disabled = false);
    messages.scrollTop = responseElement ? responseElement.offsetTop - messages.offsetTop : messages.scrollHeight;
    if (panel.open) input.focus();
  }
}
message('Hi! I can help with CREAIVA’s services, solution packages, process, and contact details. My answers link to the public website. If a detail isn’t published, I’ll help you reach the team.');
suggestions();
launch.addEventListener('click', () => { panel.showModal(); launch.setAttribute('aria-expanded', 'true'); input.focus(); });
panel.querySelector('.ca-close').addEventListener('click', () => panel.close());
panel.addEventListener('close', () => { launch.setAttribute('aria-expanded', 'false'); launch.focus(); });
panel.querySelector('form').addEventListener('submit', event => { event.preventDefault(); submit(input.value); });
