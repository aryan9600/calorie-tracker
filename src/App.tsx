import { useState, useEffect } from 'react';
import { isConnected, getPublicKey } from "@stellar/freighter-api";
import { Contract } from "calorie-tracker-client";
import DatePicker from "react-datepicker";
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import './App.css';

import "react-datepicker/dist/react-datepicker.css";


let addressLookup = (async () => {
  if (await isConnected()) return getPublicKey()
})();

let address: string;

// returning the same object identity every time avoids unnecessary re-renders
const addressObject = {
  address: '',
  displayName: '',
};

const tracker = new Contract({
  contractId: "CDD573LABMIFC6Q4DVAUYPTWAPBWRIXIH2JPUVVJOLCRDC3OVWBWBH4Q",
  networkPassphrase: "Test SDF Future Network ; October 2022",
  rpcUrl: "https://rpc-futurenet.stellar.org/",
});

const addressToHistoricObject = (address: string) => {
  addressObject.address = address;
  addressObject.displayName = `${address.slice(0, 4)}...${address.slice(-4)}`;
  return addressObject
};

const chartOptions = {
  scales: {
    y: {
      beginAtZero: false, // Set to true if you want the scale to start at zero
    },
  },
};

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
  const [caloriesToAdd, setCaloriesToAdd] = useState(0);
  const [caloriesToSub, setCaloriesToSub] = useState(0);
  const [dailyCalories, setDailyCalories] = useState(0);
  const [inputDate, setInputDate] = useState(new Date());
  const [showChart, setShowChart] = useState(false);
  const [isAddLoading, setIsAddLoading] = useState(false);
  const [isSubLoading, setIsSubLoading] = useState(false);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [modalMsg, setModalMsg] = useState('');

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


  const [isModalOpen, setModalOpen] = useState(false);
  const closeModal = () => setModalOpen(false);

  return (
    <>
      <div>
        <NavBar account={account} />
      </div>

      <div className="container">
        <h2> Select date </h2>
        <DatePicker
          showIcon
          selected={inputDate}
          onChange={(date) => setInputDate(date)}
          wrapperClassName={"customDatePickerWidth"}
          className={"customDatePickerWidth"}
        />

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
              tracker.add({
                user: account.address,
                calories: Number(caloriesToAdd),
                date: inputDate.toISOString().slice(0, 10)
              }).then(tx => {
                tx.signAndSend().then(val => {
                  setDailyCalories(val.result);
                  setModalMsg('Calories added!');
                  setModalOpen(true);
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
              tracker.subtract({
                user: account.address,
                calories: Number(caloriesToSub),
                date: inputDate.toISOString().slice(0, 10)
              }).then(tx => {
                tx.signAndSend().then(val => {
                  setDailyCalories(val.result)
                  setModalMsg('Calories subtracted!');
                  setModalOpen(true);
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
        <button
          onClick={() => {
            setIsChartLoading(true);
            tracker.get({
              user: account.address,
              dates: getLastSevenDates()
            }).then(tx => {
              tx.signAndSend().then(val => {
                console.log(val.result)
                const labels = Array.from(val.result.keys());
                const data = Array.from(val.result.values());
                setShowChart(true);
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
