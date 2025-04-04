import { SpecReporter } from 'jasmine-spec-reporter';

jasmine.getEnv().clearReporters();
jasmine.getEnv().addReporter(
  new SpecReporter({
    spec: {
      displayPending: true,
      displayDuration: true
    },
    summary: {
      displayDuration: true
    },
    stacktrace: {
      filter: (stacktrace) => stacktrace
    }
  })
);