(async ()=>{
  const base='http://localhost:4000/api';
  const now=Date.now();
  const uemail = `user2_${now}@example.local`;
  const pwd = 'password123';
  const fetchLib = (typeof fetch !== 'undefined') ? fetch : (await import('node-fetch')).default;

  console.log('REGISTER ->', uemail);
  let r = await fetchLib(base+'/auth/register', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:uemail, password:pwd})});
  let regText = await r.text(); let regBody=null;
  try { regBody = JSON.parse(regText); } catch(e) { regBody = regText; }
  console.log('register status', r.status, JSON.stringify(regBody));
  const userId = regBody && regBody.id ? regBody.id : null;
  if(!userId){ console.error('Failed to register user; aborting'); process.exit(1); }

  r = await fetchLib(base+'/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:uemail, password:pwd})});
  let login = await r.json();
  console.log('user2 login', r.status, JSON.stringify(login));
  const token2 = login.token;

  // attempt download as user2
  r = await fetchLib(base+'/files/1/download', {method:'GET', headers: {'Authorization': `Bearer ${token2}`}});
  let text1=''; try{ text1 = await r.text(); } catch(e){ text1='(no body)'; }
  console.log('download as user2 status', r.status);
  console.log('body preview:', text1.slice(0,200));

  // login admin
  r = await fetchLib(base+'/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:'admin@example.local', password:'secret123'})});
  let adminLogin = await r.json(); const adminToken = adminLogin.token;
  console.log('admin login', r.status, JSON.stringify(adminLogin));

  // grant permission
  r = await fetchLib(base+'/permissions', {method:'POST', headers:{'Content-Type':'application/json','Authorization': `Bearer ${adminToken}`}, body: JSON.stringify({user_id: userId, resource_type: 'file', resource_id: 1, permission_type: 'download'})});
  let grantBody=''; try{ grantBody = await r.text(); } catch(e){}
  console.log('grant permission status', r.status, 'body', grantBody);

  // retry download
  r = await fetchLib(base+'/files/1/download', {method:'GET', headers: {'Authorization': `Bearer ${token2}`}});
  let text2=''; try{ text2 = await r.text(); } catch(e){ text2='(no body)'; }
  console.log('download after grant status', r.status);
  console.log('body preview:', text2.slice(0,200));

})().catch(e=>{ console.error('ERROR', e); process.exit(1); });
