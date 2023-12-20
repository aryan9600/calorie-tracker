import { useState, useEffect } from 'react';
import { isConnected, getPublicKey } from "@stellar/freighter-api";
import { Contract, networks } from "calorie-tracker-client";
import DatePicker from "react-datepicker";
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import './App.css';

import "react-datepicker/dist/react-datepicker.css";

// Get the user's public key, if Freigher is installed.
let addressLookup = (async () => {
  if (await isConnected()) return getPublicKey()
})();

let address: string;

// Returning the same object identity every time avoids unnecessary re-renders
const addressObject = {
  address: '',
  displayName: '',
};

// The calorie tracker contract object.
const tracker = new Contract({
  contractId: "CCBKZI55ZOI7LID6SKOJJH3GQGXS6WJC4GZ7ECH2PY4HKVT45CHAQTD3",
  networkPassphrase: networks.futurenet.networkPassphrase,
  rpcUrl: "https://rpc-futurenet.stellar.org/",
});

// Accepts an address and returns an addressObject.
const addressToHistoricObject = (address: string) => {
  addressObject.address = address;
  addressObject.displayName = `${address.slice(0, 4)}...${address.slice(-4)}`;
  return addressObject
};

// Options for the weekly chart.
const chartOptions = {
  scales: {
    y: {
      beginAtZero: false, // Calorie count can be negative as well.
    },
  },
};

// Get the account information or prompt the user to authorize the website.
export function useAccount(): typeof addressObject | null {
  const [, setLoading] = useState(address === undefined);

  useEffect(() => {
    if (address !== undefined) return;

    addressLookup
      .then(user => { if (user) address = user })
      .finally(() => { setLoading(false) });
  }, []);

  if (address) return addressToHistoricObject(address);

  return null;
};

// Gets the dates for the last seven days.
function getLastSevenDates(): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date: Date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

function MyApp() {
  const account = useAccount()
  // Calories to be added.
  const [caloriesToAdd, setCaloriesToAdd] = useState(0);
  // Calories to be subtracted.
  const [caloriesToSub, setCaloriesToSub] = useState(0);
  // The daily calorie count after adding or subtracting.
  const [dailyCalories, setDailyCalories] = useState(0);
  // The date to record the calorie count for.
  const [inputDate, setInputDate] = useState(new Date());
  // Flag to manage the chart's visibilty.
  const [showChart, setShowChart] = useState(false);
  // Flag to manage loading indicators.
  const [isAddLoading, setIsAddLoading] = useState(false);
  const [isSubLoading, setIsSubLoading] = useState(false);
  const [isChartLoading, setIsChartLoading] = useState(false);
  // Message to display in the modal.
  const [modalMsg, setModalMsg] = useState('');

  // The data the chart needs to render.
  const [chartData, setChartData] = useState({
    labels: [''],
    datasets: [
      {
        label: 'Calories',
        data: [0],
        backgroundColor: 'rgba(44,62,80,0.2)',
        borderColor: 'rgba(44,62,80,1)',
        borderWidth: 10,
      }
    ]
  })
  // Helper function to update chart data and trigger a re-render.
  const updateChartData = (newLabels: string[], newData: number[]) => {
    setChartData(prevChartData => ({
      ...prevChartData,
      labels: newLabels,
      datasets: prevChartData.datasets.map(dataset => ({
        ...dataset,
        data: newData
      }))
    }));
  };

  // Flag to control the modal's visibility.
  const [isModalOpen, setModalOpen] = useState(false);
  const closeModal = () => setModalOpen(false);

  return (
    <>
      <div>
        <NavBar account={account} />
      </div>

      {/* The date picker that allows selecting a particular date */}
      <div className="container">
        <h2> Select date </h2>
        <DatePicker
          showIcon
          selected={inputDate}
          onChange={(date) => setInputDate(date)}
          wrapperClassName={"customDatePickerWidth"}
          className={"customDatePickerWidth"}
        />

        {/* The numerical input field that contains the calories to add. */}
        <h2> Add calories </h2>
        <input
          type="number"
          name="add"
          min="0"
          value={caloriesToAdd}
          onChange={(e) => setCaloriesToAdd(Number(e.target.value))}
        />
        {isAddLoading ? (
          <div className="spinner"></div> // Spinner element
        ) : (
          <button
            onClick={() => {
              setIsAddLoading(true);
              // Call the add method of the contract.
              tracker.add({
                user: account.address,
                calories: Number(caloriesToAdd),
                date: inputDate.toISOString().slice(0, 10)
              }).then(tx => {
                // Sign and send the transaction to the Stellar network.
                tx.signAndSend().then(val => {
                  // Modify the daily calories with the return result.
                  setDailyCalories(val.result);
                  // Display the modal.
                  setModalMsg('Calories added!');
                  setModalOpen(true);

                  // Figure out if the chart data contains this particular date and if it does then
                  // modify its data with the new calorie count so that it re-renders.
                  if (typeof chartData.labels !== 'undefined' && chartData.labels.length > 0) {
                    const idx = chartData.labels.findIndex((label) => {
                      return label === inputDate.toISOString().slice(0, 10);
                    })
                    if (idx >= 0) {
                      let newData = chartData.datasets[0].data
                      newData[idx] = val.result;
                      chartData.datasets[0].data = newData;
                      updateChartData(chartData.labels, newData)
                    }
                  }

                  setIsAddLoading(false);
                }).catch(error => {
                  console.error("error sending tx: ", error);
                  setIsAddLoading(false);
                })
              }).catch(error => {
                console.error("Error updating calories:", error);
                setIsAddLoading(false);
              })
            }}
            disabled={isAddLoading}
          >
            Submit
          </button>
        )}

        {/* The numerical input field that contains the calories to subtract. */}
        <h2> Subtract calories </h2>
        <input
          type="number"
          name="subract"
          min="0"
          value={caloriesToSub}
          onChange={(e) => setCaloriesToSub(Number(e.target.value))}
        />
        {isSubLoading ? (
          <div className="spinner"></div> // Spinner element
        ) : (
          <button
            onClick={() => {
              setIsSubLoading(true);
              // Call the subtract method of the contract.
              tracker.subtract({
                user: account.address,
                calories: Number(caloriesToSub),
                date: inputDate.toISOString().slice(0, 10)
              }).then(tx => {
                // Sign and send the transaction to the Stellar network.
                tx.signAndSend().then(val => {
                  // Modify the daily calories with the return result.
                  setDailyCalories(val.result)
                  // Display the modal.
                  setModalMsg('Calories subtracted!');
                  setModalOpen(true);

                  // Figure out if the chart data contains this particular date and if it does then
                  // modify its data with the new calorie count so that it re-renders.
                  if (typeof chartData.labels !== 'undefined' && chartData.labels.length > 0) {
                    const idx = chartData.labels.findIndex((label) => {
                      return label === inputDate.toISOString().slice(0, 10);
                    })
                    if (idx >= 0) {
                      let newData = chartData.datasets[0].data
                      newData[idx] = val.result;
                      chartData.datasets[0].data = newData;
                      updateChartData(chartData.labels, newData)
                    }
                  }

                  setIsSubLoading(false);
                }).catch(error => {
                  console.error("error sending tx: ", error);
                  setIsSubLoading(false);
                })
              }).catch(error => {
                console.error("Error updating calories:", error);
                setIsSubLoading(false);
              })
            }}
          >
            Submit
          </button>
        )}

        <p></p>

        {/* The button to get the weekly chart. It displays the calorie count of the last seven days counting back from the selected date. */}
        <button
          onClick={() => {
            setIsChartLoading(true);
            // Call the subtract method of the contract.
            tracker.get({
              user: account.address,
              dates: getLastSevenDates()
            }).then(tx => {
              // Sign and send the transaction to the Stellar network.
              tx.signAndSend().then(val => {
                const labels = Array.from(val.result.keys());
                const data = Array.from(val.result.values());

                // Display the chart.
                setShowChart(true);
                // Update the chart data with the new data.
                updateChartData(labels, data);
                setIsChartLoading(false);
              }).catch(error => {
                console.error("error sending tx: ", error);
                setIsChartLoading(false);
              })
            }).catch(error => {
              console.error("Error updating calories:", error);
              setIsChartLoading(false);
            })
          }}
          disabled={isChartLoading}
        >
          Get weekly chart
        </button>

        {isChartLoading ? (
          <div className="spinner"></div> // Spinner element
        ) : (
          showChart && <Bar data={chartData} options={chartOptions} />
        )}

        <Modal isOpen={isModalOpen} onClose={closeModal} date={inputDate.toISOString().slice(0, 10)} calories={dailyCalories} msg={modalMsg} />
      </div>
    </>
  );
}

// The modal to display after calories are added or subtracted.
const Modal = ({ isOpen, onClose, calories, date, msg }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2> {msg} </h2>
        <h3>Current calories for {date}: {calories}</h3>
        <div className="modal-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// The top nav bar containig the account's info.
const NavBar = ({ account }) => {
  return (
    <div className="navbar">
      <h1>Calorie Tracker</h1>
      {account ? (
        <h2> Wallet name: {account.displayName}</h2>
      ) : (
        <h2>Wallet not connected</h2>
      )}
    </div>
  );
};

export default MyApp;
