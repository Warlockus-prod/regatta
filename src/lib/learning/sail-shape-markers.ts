/** Read-only callouts in the exact1536x1024 illustration coordinate system. */
export function renderSailShapeMarkers(): string {
  const callouts = [
    { n: 1, x: 210, y: 260, tx: 342, ty: 455 },
    { n: 2, x: 760, y: 140, tx: 625, ty: 405 },
    { n: 3, x: 1210, y: 470, tx: 942, ty: 530 },
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1024">${callouts.map(({ n, x, y, tx, ty }) => `<path d="M${x} ${y}L${tx} ${ty}" fill="none" stroke="#123247" stroke-width="8"/><circle cx="${tx}" cy="${ty}" r="10" fill="#fffefa" stroke="#123247" stroke-width="5"/><circle cx="${x}" cy="${y}" r="64" fill="#fffefa" stroke="#123247" stroke-width="6"/><text x="${x}" y="${y + 28}" text-anchor="middle" font-family="sans-serif" font-size="80" font-weight="700" fill="#123247">${n}</text>`).join("")}</svg>`;
}
