(() => {
  const popup = document.createElement('div');
  popup.id = 'nr-picker-popover';
  popup.dataset.topicPicker = '';
  popup.hidden = true;
  popup.innerHTML = '<div class="nr-picker-searchbox"><input id="nr-picker-search" type="text" role="combobox" autocomplete="off" spellcheck="false" aria-autocomplete="list" aria-expanded="true" aria-controls="nr-picker-list" placeholder="Search topics…"></div>'
    + '<div id="nr-picker-list" role="listbox"></div><p id="nr-picker-empty" role="status" hidden>No matching topics</p>';
  document.body.append(popup);
  const search = popup.querySelector('input');
  const list = popup.querySelector('[role="listbox"]');
  list.tabIndex = -1;
  const columns = document.createElement('div');
  columns.className = 'nr-picker-columns';
  columns.setAttribute('aria-hidden','true');
  columns.innerHTML = '<span>Minimum overlap</span><span>Board links</span>';
  list.before(columns);
  const empty = popup.querySelector('[role="status"]');
  let current = null, active = null;

  function close(restoreFocus = false) {
    if (!current) return;
    const {button,focusTarget} = current;
    current = null;
    active = null;
    button.setAttribute('aria-expanded','false');
    focusTarget.removeAttribute('aria-activedescendant');
    popup.hidden = true;
    if (restoreFocus && button.isConnected) button.focus({preventScroll:true});
  }

  function position() {
    if (!current) return;
    const anchor = (current.cutoff ? current.select.parentElement : current.button).getBoundingClientRect();
    const viewport = window.visualViewport;
    const left = (viewport?.offsetLeft || 0) + 8, top = (viewport?.offsetTop || 0) + 8;
    const width = (viewport?.width || document.documentElement.clientWidth) - 16;
    const bottom = top + (viewport?.height || window.innerHeight) - 16;
    const menuWidth = current.cutoff ? Math.min(width,210)
      : width < 460 ? width : Math.min(width,Math.max(anchor.width,310));
    const above = Math.min(anchor.top - 5,bottom) - top;
    const below = bottom - Math.max(anchor.bottom + 5,top);
    const opensUp = below < 275 && above > below;
    popup.style.width = menuWidth + 'px';
    popup.style.maxHeight = Math.min(350,Math.max(80,opensUp ? above : below)) + 'px';
    const alignLeft = current.cutoff ? anchor.right - menuWidth : anchor.left;
    popup.style.left = Math.max(left,Math.min(alignLeft,left + width - menuWidth)) + 'px';
    popup.style.top = (opensUp ? Math.max(top,Math.min(bottom,anchor.top - 5) - popup.offsetHeight)
      : Math.max(top,Math.min(anchor.bottom + 5,bottom - popup.offsetHeight))) + 'px';
  }

  function highlight(row) {
    active?.classList.remove('active');
    active = row;
    if (!row) { current.focusTarget.removeAttribute('aria-activedescendant'); return; }
    row.classList.add('active');
    current.focusTarget.setAttribute('aria-activedescendant',row.id);
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
  }

  function filter() {
    const query = search.value.trim().toLowerCase();
    list.replaceChildren();
    let selected = null;
    for (const option of current.select.options) {
      if (!option.value || !option.text.toLowerCase().includes(query)) continue;
      const row = document.createElement('div');
      row.id = 'nr-picker-option-' + option.index;
      row.dataset.value = option.value;
      row.setAttribute('role','option');
      row.setAttribute('aria-selected',String(option.selected));
      row.textContent = option.text;
      if (current.cutoff) {
        const count = document.createElement('span');
        count.className = 'nr-option-count';
        count.textContent = option.dataset.links;
        row.append(count);
        row.setAttribute('aria-label',option.text + ', ' + count.textContent + ' matching links');
      }
      list.append(row);
      if (option.selected) selected = row;
    }
    empty.hidden = list.childElementCount > 0;
    list.scrollTop = 0;
    position();
    highlight(query ? list.firstElementChild : selected || list.firstElementChild);
  }

  function open(select,button,query = '') {
    close();
    const cutoff = select.id === 'nr-cut', focusTarget = cutoff ? list : search;
    current = {select,button,cutoff,focusTarget};
    popup.classList.toggle('nr-cutoff-menu',cutoff);
    button.setAttribute('aria-expanded','true');
    const label = cutoff ? 'Minimum Jaccard overlap' : select.id === 'nr-topic' ? 'Board topics' : 'Topics to compare';
    list.setAttribute('aria-label',label);
    search.setAttribute('aria-label','Search ' + label.toLowerCase());
    search.value = cutoff ? '' : query;
    popup.hidden = false;
    filter();
    focusTarget.focus({preventScroll:true});
  }

  function choose(row) {
    if (!row || !current) return;
    const {select,button} = current;
    close();
    select.value = row.dataset.value;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    const focus = button.isConnected ? button : document.querySelector('#nr-details [data-back]');
    focus?.focus({preventScroll:true});
  }

  search.addEventListener('input',filter);
  popup.addEventListener('keydown',event => {
    if (event.isComposing) return;
    switch (event.key) {
      case 'ArrowDown': highlight(active?.nextElementSibling || list.firstElementChild); break;
      case 'ArrowUp': highlight(active?.previousElementSibling || list.lastElementChild); break;
      case 'Home': if (!current.cutoff) return; highlight(list.firstElementChild); break;
      case 'End': if (!current.cutoff) return; highlight(list.lastElementChild); break;
      case ' ': if (!current.cutoff) return; choose(active); break;
      case 'Enter': choose(active); break;
      case 'Escape': close(true); break;
      case 'Tab': close(true); return;
      default: return;
    }
    event.preventDefault();
    event.stopPropagation();
  });
  list.addEventListener('mousedown',event => event.preventDefault());
  list.addEventListener('click',event => choose(event.target.closest('[role="option"]')));
  document.addEventListener('pointerdown',event => {
    if (current && !event.target.closest('[data-topic-picker]')) close();
  });
  document.addEventListener('focusin',event => {
    if (current && !popup.contains(event.target) && event.target !== current.button) close();
  });
  document.addEventListener('scroll',event => { if (current && !popup.contains(event.target)) position(); },true);
  window.addEventListener('resize',position);
  window.visualViewport?.addEventListener('resize',position);
  window.visualViewport?.addEventListener('scroll',position);
  window.addEventListener('hashchange',() => close());

  window.enhanceTopicPickers = () => {
    if (current) close(true);
    for (const select of document.querySelectorAll('#nr-topic,#nr-compare,#nr-cut')) {
      let button = document.getElementById(select.id + '-trigger');
      if (!button) {
        button = document.createElement('button');
        button.id = select.id + '-trigger';
        button.type = 'button';
        button.className = 'nr-picker-trigger';
        button.dataset.topicPicker = '';
        button.setAttribute('aria-haspopup','listbox');
        button.setAttribute('aria-controls',list.id);
        button.setAttribute('aria-expanded','false');
        button.append(document.createElement('span'));
        select.hidden = true;
        select.after(button);
        select.parentElement.htmlFor = button.id;
        select.parentElement.classList.add('nr-searchable-label');
        select.parentElement.dataset.topicPicker = '';
        button.addEventListener('click',() => current?.button === button ? close(true) : open(select,button));
        button.addEventListener('keydown',event => {
          const text = select.id !== 'nr-cut' && event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey;
          if (!text && !['ArrowDown','ArrowUp'].includes(event.key)) return;
          event.preventDefault();
          open(select,button,text ? event.key : '');
          if (event.key === 'ArrowUp' && !select.value) highlight(list.lastElementChild);
        });
      }
      const value = select.selectedOptions[0]?.text || '';
      button.firstElementChild.textContent = value;
      button.title = value;
      const label = select.id === 'nr-cut' ? 'Minimum Jaccard overlap' : select.id === 'nr-topic' ? 'Topic' : 'Compare with any topic';
      button.setAttribute('aria-label',label + ', ' + value);
    }
  };
  window.enhanceTopicPickers();
})();
