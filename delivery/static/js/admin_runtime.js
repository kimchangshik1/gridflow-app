'use strict';

window.__adminRuntimeSwitchAdmin = function() {
  if (!_currentUser || !_currentUser.is_admin) return;
  hideAllMainPanels();
  var panel = document.getElementById('admin-panel');
  if (panel) panel.style.display = 'block';
  clearTopTabs();
  var tab = document.getElementById('tab-admin');
  if (tab) tab.classList.add('active');
  fetchUsers();
};

window.switchAdmin = function switchAdmin() {
  return window.__adminRuntimeSwitchAdmin();
};

window.__adminRuntimeAddUser = async function() {
  const username = document.getElementById('admin-new-username').value.trim();
  const password = document.getElementById('admin-new-password').value;
  const msgEl = document.getElementById('admin-panel-msg');
  if (!username || !password) { msgEl.style.color='#f87171'; msgEl.textContent='아이디와 비밀번호를 입력하세요'; return; }
  const r = await authFetch('/auth/users', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({username, password, is_admin: false})
  });
  if (!r) return;
  const d = await r.json();
  if (r.ok) {
    msgEl.style.color = '#4ade80';
    msgEl.textContent = `✅ ${d.user.username} 계정 생성 완료`;
    document.getElementById('admin-new-username').value = '';
    document.getElementById('admin-new-password').value = '';
    fetchUsers();
  } else {
    msgEl.style.color = '#f87171';
    msgEl.textContent = d.detail || '생성 실패';
  }
  setTimeout(() => msgEl.textContent = '', 3000);
};

window.addUser = async function addUser() {
  return window.__adminRuntimeAddUser();
};

window.__adminRuntimeToggleDryRun = async function(userId, username, currentState) {
  const action = currentState ? '해제' : '설정';
  if (!confirm(`'${username}' DRY RUN을 ${action}할까요?`)) return;
  const r = await authFetch(`/auth/users/${userId}/dryrun`, {method: 'POST'});
  if (!r) return;
  const d = await r.json();
  const msgEl = document.getElementById('admin-panel-msg');
  if (r.ok) {
    msgEl.style.color = '#4ade80';
    msgEl.textContent = `✅ ${username} DRY RUN ${d.is_dry_run ? '설정' : '해제'} 완료`;
    fetchUsers();
  } else {
    msgEl.style.color = '#f87171';
    msgEl.textContent = d.detail || '설정 실패';
  }
  setTimeout(() => msgEl.textContent = '', 3000);
};

window.toggleDryRun = async function toggleDryRun(userId, username, currentState) {
  return window.__adminRuntimeToggleDryRun(userId, username, currentState);
};

window.__adminRuntimeDeleteUserKeys = async function(userId, username) {
  if (!confirm(`'${username}'의 API 키를 삭제할까요?\n해당 유저의 봇이 중단됩니다.`)) return;
  const r = await authFetch(`/auth/users/${userId}/keys`, {method: 'DELETE'});
  if (!r) return;
  const d = await r.json();
  const msgEl = document.getElementById('admin-panel-msg');
  if (r.ok) {
    msgEl.style.color = '#4ade80';
    msgEl.textContent = `✅ ${username} API 키 삭제 완료 (${d.deleted_keys}개)`;
    fetchUsers();
  } else {
    msgEl.style.color = '#f87171';
    msgEl.textContent = d.detail || '삭제 실패';
  }
  setTimeout(() => msgEl.textContent = '', 3000);
};

window.deleteUserKeys = async function deleteUserKeys(userId, username) {
  return window.__adminRuntimeDeleteUserKeys(userId, username);
};

window.__adminRuntimeDeleteUser = async function(userId, username) {
  if (!confirm(`'${username}' 계정을 삭제할까요?\n주문 기록은 유지됩니다.`)) return;
  const r = await authFetch(`/auth/users/${userId}`, {method: 'DELETE'});
  if (!r) return;
  const d = await r.json();
  const msgEl = document.getElementById('admin-panel-msg');
  if (r.ok) {
    msgEl.style.color = '#4ade80';
    msgEl.textContent = `✅ ${username} 삭제 완료`;
    fetchUsers();
  } else {
    msgEl.style.color = '#f87171';
    msgEl.textContent = d.detail || '삭제 실패';
  }
  setTimeout(() => msgEl.textContent = '', 3000);
};

window.deleteUser = async function deleteUser(userId, username) {
  return window.__adminRuntimeDeleteUser(userId, username);
};

window.__adminRuntimeFetchUsers = async function() {
  if (!_currentUser || !_currentUser.is_admin) return;
  const r = await authFetch('/auth/users');
  if (!r) return;
  const d = await r.json();
  const tbody = document.getElementById('admin-user-table-body');
  if (!tbody) return;

  const users = d.users || [];
  const now = Date.now();
  const h24 = 24 * 60 * 60 * 1000;
  const statTotal = users.length;
  const statActive = users.filter(u => u.is_active).length;
  const statApi = users.filter(u => u.has_api_key).length;
  const statRecent = users.filter(u => u.last_login_at && (now - new Date(u.last_login_at).getTime()) < h24).length;
  const setAdminStat = (id, val) => { var el = document.getElementById(id); if (el) el.textContent = val; };
  setAdminStat('admin-stat-total', statTotal);
  setAdminStat('admin-stat-active', statActive);
  setAdminStat('admin-stat-api', statApi);
  setAdminStat('admin-stat-recent', statRecent);

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="padding:32px;text-align:center;color:#4B5563">등록된 사용자가 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(u => {
    const joinDate = u.created_at ? u.created_at.substring(0,10) : '-';
    const lastLogin = u.last_login_at ? u.last_login_at.substring(0,16).replace('T',' ') : '-';
    const statusBadge = u.is_active
      ? '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:#10B981;background:rgba(16,185,129,0.12);padding:2px 8px;border-radius:5px;border:1px solid rgba(16,185,129,0.25)">● 활성</span>'
      : '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:#6B7280;background:rgba(75,85,99,0.15);padding:2px 8px;border-radius:5px;border:1px solid rgba(75,85,99,0.3)">● 비활성</span>';
    const apiKeyBadge = u.has_api_key
      ? '<span style="font-size:11px;color:#3B82F6;font-weight:600">● 등록됨</span>'
      : '<span style="font-size:11px;color:#4B5563">미등록</span>';
    const dryRunBadge = u.is_dry_run
      ? '<span style="font-size:11px;font-weight:700;color:#60a5fa;background:rgba(96,165,250,0.12);padding:2px 7px;border-radius:5px;border:1px solid rgba(96,165,250,0.25)">DRY</span>'
      : '<span style="font-size:11px;color:#4B5563">실거래</span>';
    const adminBadge = u.is_admin
      ? '<span style="display:inline-flex;align-items:center;white-space:nowrap;font-size:11px;font-weight:700;color:#F59E0B;background:rgba(245,158,11,0.12);padding:2px 7px;border-radius:5px;border:1px solid rgba(245,158,11,0.25)">👑 관리자</span>'
      : '<span style="font-size:11px;color:#6B7280">일반</span>';
    const currentUserId = _currentUser ? (_currentUser.user_id ?? _currentUser.id) : null;
    const isSelf = currentUserId !== null && String(u.id) === String(currentUserId);
    const actionBtns = isSelf
      ? '<span style="font-size:11px;color:#4B5563;font-style:italic;white-space:nowrap">본인 계정</span>'
      : `<button onclick="toggleDryRun(${u.id},'${u.username}',${u.is_dry_run})" style="background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.3);color:#60a5fa;padding:3px 9px;border-radius:5px;cursor:pointer;font-size:11px;font-weight:600" title="DRY RUN 전환">DRY</button>
         <button onclick="deleteUserKeys(${u.id},'${u.username}')" style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);color:#F59E0B;padding:3px 9px;border-radius:5px;cursor:pointer;font-size:11px;font-weight:600;margin-left:4px" title="API 키 삭제">키삭제</button>
         <button onclick="deleteUser(${u.id},'${u.username}')" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#EF4444;padding:3px 9px;border-radius:5px;cursor:pointer;font-size:11px;font-weight:600;margin-left:4px" title="계정 삭제">삭제</button>`;
    return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);height:42px">
      <td style="padding:0 12px;color:#F59E0B;font-weight:700;font-size:12px">${u.id}</td>
      <td style="padding:0 12px;font-weight:600;font-size:13px;color:#e6edf3">${u.username}</td>
      <td style="padding:0 12px">${statusBadge}</td>
      <td style="padding:0 12px;color:#6B7280;font-size:11px">${joinDate}</td>
      <td style="padding:0 12px;color:#6B7280;font-size:11px">${lastLogin}</td>
      <td style="padding:0 12px">${apiKeyBadge}</td>
      <td style="padding:0 12px">${dryRunBadge}</td>
      <td style="padding:0 12px;white-space:nowrap">${adminBadge}</td>
      <td style="padding:0 12px;white-space:nowrap">${actionBtns}</td>
    </tr>`;
  }).join('');
};

window.fetchUsers = async function fetchUsers() {
  return window.__adminRuntimeFetchUsers();
};
