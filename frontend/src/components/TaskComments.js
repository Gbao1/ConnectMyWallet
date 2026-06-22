import { useCallback, useEffect, useState } from 'react';
import { fetchTaskData, postCommentReply, postTaskComment } from '../api/services';

export default function TaskComments({ taskId }) {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!taskId) return;
    try {
      setLoading(true);
      const data = await fetchTaskData(taskId);
      setTask(data);
    } catch (err) {
      setError(err.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await postTaskComment(taskId, commentText.trim());
      setCommentText('');
      await load();
    } catch (err) {
      setError(err.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (commentId) => {
    const text = replyText[commentId]?.trim();
    if (!text) return;
    setSubmitting(true);
    setError(null);
    try {
      await postCommentReply(taskId, commentId, text);
      setReplyText((prev) => ({ ...prev, [commentId]: '' }));
      await load();
    } catch (err) {
      setError(err.message || 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const comments = task?.comments || [];

  return (
    <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
      <h4 className="mb-3 text-sm font-semibold text-[#0F172A]">Questions & comments</h4>
      {error ? <p className="mb-2 text-xs text-rose-600">{error}</p> : null}
      {loading ? (
        <p className="text-xs text-gray-500">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="mb-3 text-xs text-gray-500">No comments yet. Providers can ask clarifying questions here.</p>
      ) : (
        <ul className="mb-4 space-y-3">
          {comments.map((c) => {
            const cid = c._id || c.id;
            const author = c.user?.name || c.user?.email || 'User';
            return (
              <li key={cid} className="rounded-lg bg-white p-3 text-sm shadow-sm">
                <p className="font-medium text-[#0F172A]">{author}</p>
                <p className="mt-1 text-gray-600">{c.text}</p>
                {(c.replies || []).length > 0 ? (
                  <ul className="mt-2 space-y-2 border-l-2 border-orange-100 pl-3">
                    {c.replies.map((r) => (
                      <li key={r._id || r.id} className="text-xs text-gray-600">
                        <span className="font-medium">{r.user?.name || 'User'}:</span> {r.text}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={replyText[cid] || ''}
                    onChange={(e) => setReplyText((p) => ({ ...p, [cid]: e.target.value }))}
                    placeholder="Reply…"
                    className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleReply(cid)}
                    className="rounded-lg bg-[#0F172A] px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                  >
                    Reply
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={handleComment} className="flex gap-2">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Ask a question or add a note…"
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={submitting || !commentText.trim()}
          className="rounded-lg bg-[#F97316] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Post
        </button>
      </form>
    </div>
  );
}
