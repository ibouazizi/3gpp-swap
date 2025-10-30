export class CriteriaBuilder {
  constructor() {
    this.criteria = [];
  }

  withService(serviceName) { this.criteria.push({ type: 'service', value: serviceName }); return this; }
  withQos(qosLevel) { this.criteria.push({ type: 'qos', value: qosLevel }); return this; }
  withLocation(location) { this.criteria.push({ type: 'location', value: location }); return this; }
  withUser(user) { this.criteria.push({ type: 'user', value: user }); return this; }
  withApp(app) { this.criteria.push({ type: 'app', value: app }); return this; }
  with(type, value) { this.criteria.push({ type, value }); return this; }

  build() { return this.criteria; }
}

