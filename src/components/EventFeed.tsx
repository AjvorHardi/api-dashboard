import type { EventRecord } from '../lib/types'

type EventFeedProps = {
  events: EventRecord[]
}

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function EventFeed({ events }: EventFeedProps) {
  if (events.length === 0) {
    return (
      <section className="panel feed-panel empty-state">
        <p className="eyebrow">Feed</p>
        <h2>No events match the current filters</h2>
        <p>
          Create a project, send an event to the ingestion API, or loosen the current search
          query.
        </p>
      </section>
    )
  }

  return (
    <section className="panel feed-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Feed</p>
          <h2>Latest events</h2>
        </div>
        <p className="panel-meta">Showing {events.length} recent events</p>
      </div>

      <div className="feed-list">
        {events.map((event) => (
          <article className="event-card" key={event.id}>
            <div className="event-icon" aria-hidden="true">
              {event.icon || event.channel.slice(0, 1).toUpperCase()}
            </div>
            <div className="event-body">
              <div className="event-header">
                <div>
                  <div className="event-title-row">
                    <span className="channel-pill">{event.channel}</span>
                    <h3>{event.title}</h3>
                  </div>
                  {event.description ? <p className="event-description">{event.description}</p> : null}
                </div>
                <time className="event-time" dateTime={event.occurred_at}>
                  {timestampFormatter.format(new Date(event.occurred_at))}
                </time>
              </div>

              {event.tags.length > 0 ? (
                <div className="tag-row">
                  {event.tags.map((tag) => (
                    <span className="tag-chip" key={`${event.id}-${tag}`}>
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
