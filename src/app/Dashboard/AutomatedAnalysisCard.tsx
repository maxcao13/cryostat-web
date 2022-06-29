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
import { ServiceContext } from '@app/Shared/Services/Services';
import { Card, CardBody, CardTitle, CardFooter, Button } from '@patternfly/react-core';
import { RouteComponentProps, useHistory, withRouter } from 'react-router-dom';
import * as React from 'react';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { Target } from '@app/Shared/Services/Target.service';

interface AutomatedAnalysisProps {
  target: Target;
  
}

const context = React.useContext(ServiceContext);
const history = useHistory();
const addSubscription = useSubscriptions();

const [report, setReport] = React.useState(undefined as string | undefined);

const handleCreateSnapshot = (): void => {
  addSubscription(
    context.api.createSnapshot()
    .pipe(first())
    .subscribe(success => {
      if (success) {
        history.push('/recordings');
      }
    })
  );
};

React.useLayoutEffect(() => {
  const sub = context.reports.report(recording).pipe(
    first()
  ).subscribe(report => setReport(report), err => {
    if (isGenerationError(err)) {
      err.messageDetail.pipe(first()).subscribe(detail => setReport(detail));
    } else if (isHttpError(err)) {
      setReport(err.message);
    } else {
      setReport(JSON.stringify(err));
    }
  });
  return () =>  sub.unsubscribe();
}, [context, context.reports, recording, isExpanded, setReport, props, props.isExpanded, props.recording]);


const ruleRows = React.useMemo(() => {
  return recordings.map((r, idx) => <RecordingRow key={idx} recording={r} index={idx}/>)
}, [recordings, expandedRows, checkedIndices]);




export const AutomatedAnalysisCard = ({} : AutomatedAnalysisProps) => {
  const context = React.useContext(ServiceContext);

  return (<>
    <Card>
        <CardTitle>Header</CardTitle>
        <CardBody>
          <Button onClick={handleCreateSnapshot}>

          </Button>
        </CardBody>
        <CardFooter>  </CardFooter>
    </Card>

  </>);

}

function first(): any {
  throw new Error('Function not implemented.');
}

