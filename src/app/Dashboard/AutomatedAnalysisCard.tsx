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
import { NO_TARGET, Target, TargetInstance } from '@app/Shared/Services/Target.service';
import { ActiveRecording, isHttpError } from '@app/Shared/Services/Api.service';
import { filter, concatMap, first } from 'rxjs/operators';
import { isGenerationError } from '@app/Shared/Services/Report.service';
import { ScoreChip } from './ScoreChip';

interface AutomatedAnalysisProps {
  title: string
}


interface Analysis {

  scores: [{}]
}

export const AutomatedAnalysisCard = ({title} : AutomatedAnalysisProps) => {
  const context = React.useContext(ServiceContext);
  const history = useHistory();
  const addSubscription = useSubscriptions();
  const [isLoading, setIsLoading] = React.useState(false);
  const [report, setReport] = React.useState(undefined as string | undefined);
  const [recordings, setRecordings] = React.useState([] as ActiveRecording[]);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [automatedAnalysis, setAutomatedAnalysis] = React.useState(undefined as Analysis | undefined)
  


  const handleCreateSnapshot = (report): void => {
    // addSubscription(
    //   context.api.createSnapshot()
    //   .pipe(first())
    //   .subscribe(success => {
    //     if (success) {
    //       history.push('/recordings');
    //     }
    //   })
    // );
    console.log(recordings);
  };


  
  const handleRecordings = React.useCallback((recordings) => {
    setRecordings(recordings);
    setIsLoading(false);
    setErrorMessage('');
  }, [setRecordings, setIsLoading, setErrorMessage]);

  React.useEffect(() => {
    if (recordings.length !== 0) {
      addSubscription(
        context.api.getJSONReport(recordings[0].name)
        .pipe(first())
        .subscribe(value => {
          console.log(value);
          console.log("yes");
          handleCreateSnapshot(value)
        })
      );
      console.log("hehe")
    }
  }, [addSubscription, recordings, setRecordings])
  
  const handleError = React.useCallback((error) => {
    setIsLoading(false);
    setErrorMessage(error.message);
  }, [setIsLoading, setErrorMessage]);
  
  const refreshRecordingList = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.target.target()
      .pipe(
        filter(target => target !== NO_TARGET),
        concatMap(target => context.api.doGet<ActiveRecording[]>(`targets/${encodeURIComponent(target.connectUrl)}/recordings`)),
        first(),
      ).subscribe(value => handleRecordings(value), err => handleError(err))
    );
  }, [addSubscription, context, context.target, context.api, setIsLoading, handleRecordings, handleError]);
  
  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe(refreshRecordingList)
    );
  }, [addSubscription, context, context.target, refreshRecordingList]);

  React.useEffect(() => {
    const sub = context.target.authFailure().subscribe(() => {
      setErrorMessage("Auth failure");
    });
    return () => sub.unsubscribe();
  }, [context, context.target, setErrorMessage]);
  
  return (<>
    <Card>
        <CardTitle>{title}</CardTitle>
        <CardBody>
          {/* <Button onClick={() => console.log("Hello")}>

          </Button> */}
          <ScoreChip />
        </CardBody>
        <CardFooter>  </CardFooter>
    </Card>

  </>);

}

