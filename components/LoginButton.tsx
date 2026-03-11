'use client';

export function LoginButton() {
  const handleLogin = () => {
    window.location.href = '/api/auth/figma';
  };

  return (
    <button
      onClick={handleLogin}
      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
    >
      Login with Figma
    </button>
  );
}
