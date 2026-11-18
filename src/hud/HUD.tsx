import { useEffect, useState } from "react";
import { useGame } from "../game/state";

function TicketCard({ id }: { id: number }) {
  const t = useGame((s) => s.tickets.find((t) => t.id === id));
  const plateToPass = useGame((s) => s.plateToPass);
  if (!t || t.state !== "rail") return null;
  return (
    <div className={`ticket ${t.age > 20 ? "old" : ""}`} onClick={() => plateToPass(id)}>
      <div className="tno">TABLE {t.table} · #{t.id}</div>
      <div>{t.dish}</div>
    </div>
  );
}

function Chorus() {
  const screamAt = useGame((s) => s.screamAt);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (screamAt) setShown(screamAt);
  }, [screamAt]);
  if (!shown) return null;
  return (
    <div className="chorus" key={shown}>
      "YES, CHEF!"
    </div>
  );
}

export default function HUD() {
  const phase = useGame((s) => s.phase);
  const start = useGame((s) => s.start);
  const tickets = useGame((s) => s.tickets);
  const judge = useGame((s) => s.judge);
  const scream = useGame((s) => s.scream);
  const served = useGame((s) => s.served);
  const sentBack = useGame((s) => s.sentBack);
  const smashed = useGame((s) => s.smashed);
  const morale = useGame((s) => s.morale);
  const ego = useGame((s) => s.ego);
  const criticFlagged = useGame((s) => s.criticFlagged);
  const serviceTime = useGame((s) => s.serviceTime);

  const atPass = tickets.some((t) => t.state === "pass");
  const rail = tickets.filter((t) => t.state === "rail");

  return (
    <div className="hud">
      {phase === "title" && (
        <div className="title-card">
          <h1>MISE EN MOSH</h1>
          <div className="tag">
            Everything in its place. Until the tickets start flying.
          </div>
          <button className="btn" onClick={start}>
            BEGIN SERVICE
          </button>
        </div>
      )}
      {phase === "service" && (
        <>
          <div className="hint">
            Click a ticket to plate it at the pass. One guest tonight is the
            inspector — click them before dessert.{" "}
            {criticFlagged ? "Flag logged." : ""}
          </div>
          <div className="rail">
            {rail.map((t) => (
              <TicketCard key={t.id} id={t.id} />
            ))}
          </div>
          {atPass && (
            <div className="pass-actions">
              <button className="btn serve" onClick={() => judge("serve")}>
                SERVE
              </button>
              <button className="btn back" onClick={() => judge("sendback")}>
                SEND BACK
              </button>
              <button className="btn smash" onClick={() => judge("smash")}>
                SMASH
              </button>
            </div>
          )}
          <div className="status">
            SERVICE <b>{Math.floor(serviceTime / 60)}:{String(Math.floor(serviceTime % 60)).padStart(2, "0")}</b>
            <br />
            SERVED <b>{served}</b> · BACK <b>{sentBack}</b> · SMASHED <b>{smashed}</b>
            <br />
            BRIGADE <b>{Math.round(morale)}</b> · EGO <b>{Math.round(ego)}</b>
          </div>
          <button className="btn scream" onClick={scream}>
            SCREAM
          </button>
          <Chorus />
        </>
      )}
    </div>
  );
}
