import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, LoaderCircle, UserRound } from 'lucide-react';
import { supabase } from './supabase.js';
import './profile.css';

const empty = {
  full_name: '',
  gender: '',
  stream: '',
  study_level: '',
  institution: '',
};

export default function ProfilePage({ user, onBack, onSaved }) {
  const [profile, setProfile] = useState({ ...empty, ...(user.user_metadata || {}) });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    setProfile({ ...empty, ...(user.user_metadata || {}) });
  }, [user]);

  const setField = (k, v) => setProfile(p => ({ ...p, [k]: v }));

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr('');
    setNotice('');

    const updates = {};
    for (const k of Object.keys(empty)) {
      updates[k] = String(profile[k] || '').trim();
    }

    try {
      const { error } = await supabase.auth.updateUser({ data: updates });
      if (error) throw error;
      setNotice('Your profile has been saved.');
      onSaved?.();
    } catch (e2) {
      setErr(e2.message || 'Could not save your profile. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content-wrap profile-page">
      <button className="text-link profile-back" onClick={onBack}>
        <ArrowLeft size={15} /> Back to workspace
      </button>
      <header className="profile-page-heading">
        <span className="profile-page-icon"><UserRound size={22} /></span>
        <div>
          <div className="eyebrow">YOUR ACCOUNT</div>
          <h1>Your profile</h1>
          <p className="welcome-sub">Add a few details to make your learning space feel like yours.</p>
        </div>
      </header>
      <form className="profile-form" onSubmit={onSave}>
        <section className="profile-section">
          <div className="profile-section-title">
            <h2>Basic details</h2>
            <p>Your details are saved privately to your account.</p>
          </div>
          <div className="profile-fields">
            <label>
              Full name
              <input
                value={profile.full_name || ''}
                onChange={e => setField('full_name', e.target.value)}
                placeholder="Your name"
                maxLength="80"
              />
            </label>
            <label>
              Email address
              <input value={user.email || ''} readOnly disabled />
            </label>
            <label>
              Gender
              <select value={profile.gender || ''} onChange={e => setField('gender', e.target.value)}>
                <option value="">Prefer not to say</option>
                <option>Woman</option>
                <option>Man</option>
                <option>Non-binary</option>
                <option>Self describe</option>
              </select>
            </label>
            <label>
              Stream of study
              <select value={profile.stream || ''} onChange={e => setField('stream', e.target.value)}>
                <option value="">Choose a stream</option>
                <option>Science</option>
                <option>Commerce</option>
                <option>Arts and humanities</option>
                <option>Engineering and technology</option>
                <option>Medicine and health</option>
                <option>Business and management</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Study level
              <select value={profile.study_level || ''} onChange={e => setField('study_level', e.target.value)}>
                <option value="">Choose a level</option>
                <option>Middle school</option>
                <option>High school</option>
                <option>Undergraduate</option>
                <option>Postgraduate</option>
                <option>Doctoral</option>
                <option>Independent learner</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              School, college, or institution
              <input
                value={profile.institution || ''}
                onChange={e => setField('institution', e.target.value)}
                placeholder="Optional"
                maxLength="120"
              />
            </label>
          </div>
        </section>
        <div className="profile-form-footer">
          {err && <p className="profile-error" role="alert">{err}</p>}
          {notice && <p className="profile-success" role="status"><Check size={14} /> {notice}</p>}
          <button className="profile-save" type="submit" disabled={saving}>
            {saving ? <><LoaderCircle className="auth-spin" size={15} /> Saving…</> : 'Save profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
