(ns metabase.util.analytics
  "Functions for sending Snowplow analytics events"
  (:import [com.snowplowanalytics.snowplow.tracker Tracker Tracker$TrackerBuilder]
           [com.snowplowanalytics.snowplow.tracker.emitter BatchEmitter Emitter]
           com.snowplowanalytics.snowplow.tracker.http.ApacheHttpClientAdapter
           org.apache.http.impl.client.HttpClients
           org.apache.http.impl.conn.PoolingHttpClientConnectionManager
           com.snowplowanalytics.snowplow.tracker.payload.SelfDescribingJson
           com.snowplowanalytics.snowplow.tracker.events.Unstructured))

(def ^:private ^Emitter emitter
  "An instance of a Snowplow emitter"
  (let [manager (new PoolingHttpClientConnectionManager)
        client  (-> (. HttpClients custom)
                    (.setConnectionManager manager)
                    (.build))
        adapter (-> (. ApacheHttpClientAdapter builder)
                    (.url  "http://localhost:9090")
                    (.httpClient client)
                    (.build))]
    (-> (. BatchEmitter builder)
        (.httpClientAdapter adapter)
        (.bufferSize 1) ;; TODO bump buffer size back to 5?
        (.build))))

(def ^:private ^Tracker tracker
  "An instance of a Snowplow tracker"
  (-> (Tracker$TrackerBuilder. emitter "sp" "metabase")
    (.build)))

(defn- payload
  []
  (let [event-data (doto (new java.util.HashMap)
                     (.put "event" "database_selected")
                     (.put "version" "1.0.0")
                     (.put "database" "test"))]
    (new SelfDescribingJson "iglu:com.metabase/setup/jsonschema/1-0-1" event-data)))

(comment (.track tracker (-> (. Unstructured builder)
                             (.eventData (payload))
                             (.build))))
