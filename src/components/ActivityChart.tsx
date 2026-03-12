import type { EventRecord } from '../lib/types'

type ActivityChartProps = {
  events: EventRecord[]
}

type Bucket = {
  count: number
  key: string
  label: string
}

function bucketKey(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function buildBuckets(events: EventRecord[]): Bucket[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))

    return {
      count: 0,
      key: bucketKey(date),
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
    }
  })

  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]))

  for (const event of events) {
    const key = bucketKey(new Date(event.occurred_at))
    const bucket = bucketMap.get(key)

    if (bucket) {
      bucket.count += 1
    }
  }

  return buckets
}

export function ActivityChart({ events }: ActivityChartProps) {
  const buckets = buildBuckets(events)
  const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1)

  return (
    <section className="panel chart-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Activity</p>
          <h2>Events over the last 7 days</h2>
        </div>
        <p className="panel-meta">{events.length} events in the current view</p>
      </div>
      <div className="chart-grid" role="img" aria-label="Bar chart of event activity over the last 7 days">
        {buckets.map((bucket) => (
          <div className="chart-column" key={bucket.key}>
            <span className="chart-count">{bucket.count}</span>
            <div className="chart-bar-track">
              <div
                className="chart-bar"
                style={{
                  height: `${Math.max((bucket.count / maxCount) * 100, bucket.count > 0 ? 12 : 2)}%`,
                }}
              />
            </div>
            <span className="chart-label">{bucket.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
