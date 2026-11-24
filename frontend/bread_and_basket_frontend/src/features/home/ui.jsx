import { Link } from 'react-router-dom';
export function Card({ title, count, to, children }) {
  const heading = (
    <h2 className="home-card__title">
      {title}
      {count !== undefined && <span className="home-card__count"> {count}</span>}
    </h2>
  );
  return (
    <section className="home-card" aria-label={title}>
      {to ? <Link to={to}>{heading}</Link> : heading}
      {children}
    </section>
  );
}
export function Empty({ children }) {
  return <p className="home-card__empty">{children}</p>;
}
export function Loading() {
  return <p role="status">Loading…</p>;
}
export function LoadError({ retry }) {
  return (
    <div role="alert">
      <p>We couldn't load your dashboard.</p>
      <button type="button" onClick={retry}>
        Retry
      </button>
    </div>
  );
}