import React from 'react';
import ReactDOM from 'react-dom/client';
import { MaxUI } from '@maxhub/max-ui';
import '@maxhub/max-ui/dist/styles.css';
import App from './App.jsx';

const Root = () => (
  <MaxUI>
    <App />
  </MaxUI>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);


