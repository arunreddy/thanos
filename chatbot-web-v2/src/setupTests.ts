import '@testing-library/jest-dom';
import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Add the custom matchers from jest-dom
expect.extend(matchers);