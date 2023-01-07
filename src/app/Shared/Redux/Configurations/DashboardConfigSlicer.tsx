/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { gridSpans } from '@patternfly/react-core';
import { createAction, createReducer } from '@reduxjs/toolkit';
import { getPersistedState } from '../utils';

const _version = '1';

// Common action string format: "resource(s)/action"
export enum DashboardConfigAction {
  CARD_ADD = 'dashboard-card-config/add',
  CARD_REMOVE = 'dashboard-card-config/remove',
  CARD_RESIZE = 'dashboard-card-config/resize',
}

export const enumValues = new Set(Object.values(DashboardConfigAction));

export interface DashboardAddConfigActionPayload {
  name: string;
  props: object;
}

export interface DashboardDeleteConfigActionPayload {
  idx: number;
}

export interface DashboardResizeConfigActionPayload {
  idx: number;
  span: number;
}

export const dashboardCardConfigAddCardIntent = createAction(
  DashboardConfigAction.CARD_ADD,
  (name: string, span: gridSpans, props: object) => ({
    payload: {
      name,
      span,
      props,
    } as DashboardAddConfigActionPayload,
  })
);

export const dashboardCardConfigDeleteCardIntent = createAction(DashboardConfigAction.CARD_REMOVE, (idx: number) => ({
  payload: {
    idx,
  } as DashboardDeleteConfigActionPayload,
}));

export const dashboardCardConfigResizeCardIntent = createAction(
  DashboardConfigAction.CARD_RESIZE,
  (idx: number, span: gridSpans) => ({
    payload: {
      idx,
      span,
    } as DashboardResizeConfigActionPayload,
  })
);

export interface CardConfig {
  name: string;
  span: gridSpans;
  props: object;
}

const INITIAL_STATE = getPersistedState('DASHBOARD_CFG', _version, {
  list: [] as CardConfig[],
});

export const dashboardConfigReducer = createReducer(INITIAL_STATE, (builder) => {
  builder
    .addCase(dashboardCardConfigAddCardIntent, (state, { payload }) => {
      state.list.push(payload);
    })
    .addCase(dashboardCardConfigDeleteCardIntent, (state, { payload }) => {
      state.list.splice(payload.idx || 0, 1);
    })
    .addCase(dashboardCardConfigResizeCardIntent, (state, { payload }) => {
      state.list[payload.idx].span = payload.span;
    });
});

export default dashboardConfigReducer;
