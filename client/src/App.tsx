import type { JSX } from 'react';

export default function App(): JSX.Element {
  return (
    <div>
      <h1>Presight User Directory</h1>
      <p>Server: <a href="http://localhost:3001/health">/health</a></p>
    </div>
  );
}
